(function () {
    var STORAGE_KEY = "siga-payment-flow";
    var LEGACY_STORAGE_KEY = "siga-payment-flow";
    var API_BASE = resolveApiBase();
    var CEP_API_BASE = resolveCepApiBase();
    var REQUEST_TIMEOUT_MS = 15000;
    var SUBMIT_DEBOUNCE_MS = 600;
    var CLICK_DEBOUNCE_MS = 350;
    var PAYMENT_OPTIONS = [
        {
            id: "credit-1",
            label: "Cartão de crédito à vista",
            description: "Checkout link enviado por e-mail para pagamento em 1x.",
            parcelas: 1,
            planoId: 1,
            retornoId: null
        },
        {
            id: "credit-3",
            label: "Cartão de crédito em 3x",
            description: "Parcelamento em 3x no checkout link.",
            parcelas: 3,
            planoId: 3,
            retornoId: null
        },
        {
            id: "credit-6",
            label: "Cartão de crédito em 6x",
            description: "Parcelamento em 6x no checkout link.",
            parcelas: 6,
            planoId: 6,
            retornoId: null
        }
    ];
    var httpClient = createHttpClient(API_BASE);
    var cepHttpClient = createHttpClient(CEP_API_BASE);

    document.addEventListener("DOMContentLoaded", function () {
        var page = document.body.getAttribute("data-page");

        if (page === "index") {
            initIndexPage();
        }

        if (page === "consulta") {
            initConsultaPage();
        }

        if (page === "debitos") {
            initDebitosPage();
        }
    });

    function initIndexPage() {
        setupConsultaEntryForm({
            formId: "index-consulta-form",
            renavamId: "index-renavam",
            stateId: "index-state",
            emailId: "index-email",
            submitId: "index-consulta-submit",
            feedbackId: "index-feedback",
            successMessage: "Consulta concluída. Abrindo a tela de pagamento..."
        });
    }

    function initConsultaPage() {
        hydrateConsultaStateCard();
        setupConsultaEntryForm({
            formId: "consulta-form",
            renavamId: "renavam",
            emailId: "consulta-email",
            submitId: "consulta-submit",
            feedbackId: "consulta-feedback",
            successMessage: "Consulta concluída. Redirecionando para o pagamento..."
        });
    }

    function setupConsultaEntryForm(config) {
        var form = document.getElementById(config.formId);
        if (!form) {
            return;
        }

        var renavamInput = document.getElementById(config.renavamId);
        var emailInput = document.getElementById(config.emailId);
        var feedbackNode = document.getElementById(config.feedbackId);
        var submitButton = document.getElementById(config.submitId);
        var submitState = createSubmitGuard();

        if (renavamInput) {
            renavamInput.addEventListener("input", function () {
                var sanitized = sanitizeRenavam(renavamInput.value);
                if (sanitized !== renavamInput.value) {
                    renavamInput.value = sanitized;
                }
                clearFieldError(form, "renavam");
            });
        }

        if (emailInput) {
            emailInput.addEventListener("input", function () {
                clearFieldError(form, "email");
            });
        }

        form.addEventListener("submit", debounce(function (event) {
            event.preventDefault();
            runExclusive(submitState, async function () {
                clearFieldErrors(form);
                setFeedbackState(feedbackNode, "hidden");

                var renavam = sanitizeRenavam(renavamInput ? renavamInput.value : "");
                var estado = config.stateId ? safeTrim(document.getElementById(config.stateId).value) : "";
                var email = normalizeEmail(emailInput ? emailInput.value : "");
                var errors = validateConsultaData({
                    renavam: renavam,
                    email: email
                });

                if (Object.keys(errors).length) {
                    applyFieldErrors(form, errors);
                    setFeedbackState(feedbackNode, "error", "Revise os campos destacados e tente novamente.");
                    return;
                }

                if (renavamInput) {
                    renavamInput.value = renavam;
                }
                if (emailInput) {
                    emailInput.value = email;
                }

                setLoading(submitButton, true, "Consultando...");
                setFeedbackState(feedbackNode, "loading", "Consultando débitos do veículo...");

                try {
                    var data = await postConsulta(renavam);
                    var items = buildDebtItems(data);
                    var state = readState();

                    state.consulta = {
                        renavam: renavam,
                        estado: estado,
                        email: email,
                        response: sanitizeConsultaResponse(data),
                        debtItems: items,
                        paymentOptionId: state.consulta && state.consulta.paymentOptionId ? state.consulta.paymentOptionId : PAYMENT_OPTIONS[0].id,
                        updatedAt: new Date().toISOString()
                    };

                    state.pessoal = sanitizePersonalData(state.pessoal || {
                        nome: "",
                        cep: "",
                        numero: "",
                        complemento: "",
                        logradouro: "",
                        bairro: "",
                        cidade: "",
                        uf: "",
                        email: email,
                        confirmEmail: email,
                        telefone: ""
                    });

                    if (!state.pessoal.email) {
                        state.pessoal.email = email;
                        state.pessoal.confirmEmail = email;
                    }

                    state.etapaAtual = 2;
                    state.checkout = null;

                    saveState(state);
                    setFeedbackState(feedbackNode, "success", config.successMessage);

                    if (document.body.getAttribute("data-page") === "consulta") {
                        hydrateConsultaStateCard();
                    }

                    window.setTimeout(function () {
                        window.location.href = "debitos.html";
                    }, 700);
                } catch (error) {
                    setFeedbackState(feedbackNode, "error", getErrorMessage(error));
                } finally {
                    setLoading(submitButton, false);
                }
            });
        }, SUBMIT_DEBOUNCE_MS, true));
    }

    function initDebitosPage() {
        var state = readState();
        var consulta = state.consulta;

        if (!consulta || !consulta.response) {
            showElement(document.getElementById("debitos-missing-card"));
            hideElement(document.getElementById("step-2"));
            hideElement(document.getElementById("step-3"));
            hideElement(document.getElementById("step-4"));
            return;
        }

        ensureDefaultSelections(state);
        saveState(state);

        hydrateSidebar(state);
        renderCurrentStep(state.etapaAtual || 2);

        bindDebtsActions();
        bindPersonalActions();
        bindCheckoutActions();

        renderDebtsStep();
        hydratePersonalForm();
        hydrateReviewStep();
    }

    function bindDebtsActions() {
        var debtsList = document.getElementById("debts-list");
        var paymentMethods = document.getElementById("payment-methods");
        var nextButton = document.getElementById("go-to-personal");
        var feedbackNode = document.getElementById("debitos-feedback");

        debtsList.addEventListener("change", function (event) {
            if (!event.target.matches("input[type='checkbox'][data-debt-id]")) {
                return;
            }

            var state = readState();
            var item = findDebtItem(state, event.target.getAttribute("data-debt-id"));
            if (!item) {
                return;
            }

            if (item.required) {
                event.target.checked = true;
                return;
            }

            item.selected = !!event.target.checked;
            state.etapaAtual = 2;
            state.checkout = null;
            saveState(state);
            renderDebtsStep();
            hydrateSidebar(state);
        });

        paymentMethods.addEventListener("change", function (event) {
            if (!event.target.matches("input[type='radio'][name='payment-option']")) {
                return;
            }

            var state = readState();
            state.consulta.paymentOptionId = event.target.value;
            state.etapaAtual = 2;
            state.checkout = null;
            saveState(state);
            renderDebtsStep();
            hydrateSidebar(state);
        });

        nextButton.addEventListener("click", debounce(function () {
            var state = readState();
            if (!getSelectedDebtItems(state).length) {
                setFeedbackState(feedbackNode, "error", "Selecione pelo menos um débito para continuar.");
                return;
            }

            setFeedbackState(feedbackNode, "hidden");
            state.etapaAtual = 3;
            saveState(state);
            renderCurrentStep(3);
            hydratePersonalForm();
            hydrateReviewStep();
        }, CLICK_DEBOUNCE_MS, true));
    }

    function bindPersonalActions() {
        var form = document.getElementById("personal-form");
        var backButton = document.getElementById("back-to-debts");
        var cepInput = document.getElementById("delivery-cep");
        var cepButton = document.getElementById("lookup-cep");
        var cepFeedback = document.getElementById("cep-feedback");
        var lookupState = createSubmitGuard();

        if (!form || !backButton) {
            return;
        }

        backButton.addEventListener("click", debounce(function () {
            var state = readState();
            state.etapaAtual = 2;
            saveState(state);
            renderCurrentStep(2);
        }, CLICK_DEBOUNCE_MS, true));

        if (cepInput) {
            cepInput.addEventListener("input", function (event) {
                event.target.value = formatCep(event.target.value);
                if (sanitizeCep(event.target.value).length < 8) {
                    clearAddressLookupFields();
                    setAddressFieldsReadonly(false);
                }
                clearFieldError(form, "cep");
                setFeedbackState(cepFeedback, "hidden");
            });

            cepInput.addEventListener("blur", function () {
                if (sanitizeCep(cepInput.value).length === 8) {
                    fetchAddressByCep(form, lookupState);
                }
            });
        }

        if (cepButton) {
            cepButton.addEventListener("click", debounce(function () {
                fetchAddressByCep(form, lookupState);
            }, CLICK_DEBOUNCE_MS, true));
        }

        form.addEventListener("submit", debounce(function (event) {
            event.preventDefault();
            clearFieldErrors(form);
            setFeedbackState(document.getElementById("debitos-feedback"), "hidden");
            setFeedbackState(cepFeedback, "hidden");

            var personal = sanitizePersonalData({
                nome: document.getElementById("full-name").value,
                cep: document.getElementById("delivery-cep").value,
                numero: document.getElementById("delivery-number").value,
                complemento: document.getElementById("delivery-complement").value,
                logradouro: document.getElementById("delivery-street").value,
                bairro: document.getElementById("delivery-neighborhood").value,
                cidade: document.getElementById("delivery-city").value,
                uf: document.getElementById("delivery-state").value,
                email: document.getElementById("personal-email").value,
                confirmEmail: document.getElementById("personal-email-confirm").value,
                telefone: document.getElementById("personal-phone").value
            });
            var errors = validatePersonalData(personal);

            if (Object.keys(errors).length) {
                applyFieldErrors(form, errors);
                setFeedbackState(document.getElementById("debitos-feedback"), "error", "Revise os dados pessoais antes de continuar.");
                return;
            }

            syncPersonalInputs(personal);

            var state = readState();
            state.pessoal = personal;
            state.etapaAtual = 4;
            state.checkout = null;
            saveState(state);

            hydrateSidebar(state);
            hydrateReviewStep();
            renderCurrentStep(4);
        }, SUBMIT_DEBOUNCE_MS, true));

        form.addEventListener("input", function (event) {
            if (event.target.id === "personal-phone") {
                event.target.value = formatPhone(event.target.value);
            }

            if (event.target.id === "delivery-state") {
                event.target.value = normalizeStateCode(event.target.value);
            }

            clearFieldError(form, event.target.name || event.target.id);
        });
    }

    function bindCheckoutActions() {
        var backButton = document.getElementById("back-to-personal");
        var submitButton = document.getElementById("submit-checkout");
        var restartButton = document.getElementById("restart-flow");
        var checkoutState = createSubmitGuard();

        if (backButton) {
            backButton.addEventListener("click", debounce(function () {
                var state = readState();
                state.etapaAtual = 3;
                saveState(state);
                renderCurrentStep(3);
            }, CLICK_DEBOUNCE_MS, true));
        }

        if (!submitButton) {
            if (restartButton) {
                restartButton.addEventListener("click", debounce(resetPaymentFlow, CLICK_DEBOUNCE_MS, true));
            }
            return;
        }

        submitButton.addEventListener("click", debounce(function () {
            runExclusive(checkoutState, async function () {
                var state = readState();
                var selectedDebts = getSelectedDebtItems(state);
                var paymentOption = getSelectedPaymentOption(state);
                var total = calculateSelectedTotal(state);
                var feedbackNode = document.getElementById("debitos-feedback");
                var checkoutResult = document.getElementById("checkout-result");

                setFeedbackState(feedbackNode, "hidden");
                setFeedbackState(checkoutResult, "hidden");

                if (!selectedDebts.length) {
                    setFeedbackState(feedbackNode, "error", "Selecione pelo menos um débito antes de enviar o checkout.");
                    renderCurrentStep(2);
                    return;
                }

                var personal = sanitizePersonalData(state.pessoal || {});
                var personalErrors = validatePersonalData(personal);
                if (Object.keys(personalErrors).length) {
                    setFeedbackState(feedbackNode, "error", "Revise os dados pessoais antes de gerar o checkout.");
                    state.etapaAtual = 3;
                    state.pessoal = personal;
                    saveState(state);
                    renderCurrentStep(3);
                    hydratePersonalForm();
                    return;
                }

                var payload = {
                    descricao: limitText(buildCheckoutDescription(state, selectedDebts), 140),
                    email: personal.email,
                    identificacao: limitText(safeText(state.consulta.response.identificador || state.consulta.renavam), 60),
                    parcelas: paymentOption.parcelas,
                    planoId: paymentOption.planoId,
                    retornoId: paymentOption.retornoId,
                    valorTotal: Math.round(total * 100),
                    nomeCliente: personal.nome,
                    telefone: getPhoneDigits(personal.telefone),
                    renavam: state.consulta.renavam,
                    endereco: personal.endereco,
                    servicosDebitos: limitText(buildCheckoutServicesLabel(selectedDebts), 2000),
                    formaPagamento: limitText(paymentOption.label, 100)
                };

                setLoading(submitButton, true, "Enviando...");
                setFeedbackState(checkoutResult, "loading", "Enviando checkout link...");

                try {
                    var response = await postCheckout(payload);
                    state.checkout = {
                        payload: payload,
                        response: sanitizeCheckoutResponse(response),
                        protocol: extractCheckoutProtocol(response, payload),
                        maskedEmail: extractCheckoutEmail(response, personal.email),
                        updatedAt: new Date().toISOString()
                    };
                    state.etapaAtual = 4;
                    saveState(state);

                    hydrateReviewStep();
                } catch (error) {
                    setFeedbackState(checkoutResult, "error", getErrorMessage(error));
                } finally {
                    setLoading(submitButton, false);
                }
            });
        }, SUBMIT_DEBOUNCE_MS, true));

        if (restartButton) {
            restartButton.addEventListener("click", debounce(resetPaymentFlow, CLICK_DEBOUNCE_MS, true));
        }
    }

    function hydrateConsultaStateCard() {
        var state = readState();
        var consulta = state.consulta;

        if (!consulta || !consulta.response) {
            hideElement(document.getElementById("consulta-state-content"));
            showElement(document.getElementById("consulta-state-empty"));
            return;
        }

        showElement(document.getElementById("consulta-state-content"));
        hideElement(document.getElementById("consulta-state-empty"));

        var vehicle = consulta.response.veiculo || {};
        setText("state-owner", vehicle.proprietario || "Consulta pronta para continuar");
        setText("state-plate", vehicle.placa || "Placa indisponível");
        setText("state-status", "Consulta concluída");
        setText("state-renavam", consulta.renavam || "-");
        setText("state-email", consulta.email || "-");
    }

    function hydrateSidebar(state) {
        var consulta = state.consulta;
        var vehicle = consulta.response.veiculo || {};

        showElement(document.getElementById("vehicle-summary-content"));
        hideElement(document.getElementById("vehicle-summary-empty"));

        setText("vehicle-owner", vehicle.proprietario || "Proprietário não informado");
        setText("vehicle-plate", vehicle.placa || "Placa indisponível");
        setText("vehicle-renavam", vehicle.renavam || consulta.renavam || "-");
        setText("vehicle-city", [vehicle.municipioDescricao, vehicle.uf].filter(Boolean).join(" / ") || "-");
        setText("vehicle-identification", consulta.response.identificador || "-");
        setText("vehicle-status", getSelectedDebtItems(state).length ? "Débitos prontos para pagamento" : "Nenhum débito selecionado");
        setText("vehicle-last-update", "Atualizado em: " + formatDateTime(consulta.updatedAt));
        setText("sidebar-email", (state.pessoal && state.pessoal.email) || consulta.email || "-");
        setText("sidebar-total", formatCurrency(calculateSelectedTotal(state)));

        updateProgressStep(state.etapaAtual || 2);
    }

    function renderDebtsStep() {
        var state = readState();
        var items = state.consulta.debtItems || [];
        var list = document.getElementById("debts-list");
        var summaryLines = document.getElementById("summary-lines");
        var selectedTotal = document.getElementById("selected-total");
        var paymentMethods = document.getElementById("payment-methods");
        var groupedItems = items.reduce(function (groups, item) {
            if (!groups[item.group]) {
                groups[item.group] = [];
            }

            groups[item.group].push(item);
            return groups;
        }, {});

        clearChildren(list);
        Object.keys(groupedItems).forEach(function (groupName) {
            var section = createElement("div", { className: "debts-section" });
            section.appendChild(createElement("h3", { text: groupName }));

            groupedItems[groupName].forEach(function (item) {
                section.appendChild(createDebtItemNode(item));
            });

            list.appendChild(section);
        });

        clearChildren(paymentMethods);
        PAYMENT_OPTIONS.forEach(function (option) {
            paymentMethods.appendChild(createPaymentOptionNode(option, option.id === state.consulta.paymentOptionId));
        });

        var selectedItems = getSelectedDebtItems(state);
        clearChildren(summaryLines);
        selectedItems.forEach(function (item) {
            summaryLines.appendChild(createSummaryItemNode(item.title, formatCurrency(item.amount)));
        });

        selectedTotal.textContent = formatCurrency(calculateSelectedTotal(state));
        hydrateSidebar(state);
    }

    function hydratePersonalForm() {
        var state = readState();
        var personal = sanitizePersonalData(state.pessoal || {});

        document.getElementById("full-name").value = personal.nome || "";
        document.getElementById("delivery-cep").value = personal.cep || "";
        document.getElementById("delivery-number").value = personal.numero || "";
        document.getElementById("delivery-complement").value = personal.complemento || "";
        document.getElementById("delivery-street").value = personal.logradouro || "";
        document.getElementById("delivery-neighborhood").value = personal.bairro || "";
        document.getElementById("delivery-city").value = personal.cidade || "";
        document.getElementById("delivery-state").value = personal.uf || "";
        document.getElementById("personal-email").value = personal.email || state.consulta.email || "";
        document.getElementById("personal-email-confirm").value = personal.confirmEmail || state.consulta.email || "";
        document.getElementById("personal-phone").value = personal.telefone || "";
        setAddressFieldsReadonly(hasLookupAddress(personal));
    }

    function hydrateReviewStep() {
        var state = readState();
        var selectedItems = getSelectedDebtItems(state);
        var personal = sanitizePersonalData(state.pessoal || {});
        var reviewDebts = document.getElementById("review-debts");
        var reviewPersonal = document.getElementById("review-personal");
        var reviewTotal = document.getElementById("review-total");
        var checkoutResult = document.getElementById("checkout-result");
        var successFeedback = document.getElementById("checkout-success-feedback");
        var isSuccess = !!(state.checkout && state.checkout.response && state.checkout.response.sucesso !== false);

        clearChildren(reviewDebts);
        selectedItems.forEach(function (item) {
            reviewDebts.appendChild(createSummaryItemNode(item.title, formatCurrency(item.amount)));
        });

        clearChildren(reviewPersonal);
        [
            { label: "Nome", value: personal.nome || "-" },
            { label: "Endereço", value: personal.endereco || "-" },
            { label: "E-mail", value: personal.email || "-" },
            { label: "Telefone", value: personal.telefone || "-" },
            { label: "Pagamento", value: getSelectedPaymentOption(state).label }
        ].forEach(function (entry) {
            reviewPersonal.appendChild(createSummaryItemNode(entry.label, entry.value));
        });

        reviewTotal.textContent = formatCurrency(calculateSelectedTotal(state));

        if (state.checkout && state.checkout.response) {
            toggleCheckoutSuccessState(isSuccess);
            if (isSuccess) {
                setSuccessSummary(state);
                setFeedbackState(
                    successFeedback,
                    "success",
                    buildCheckoutSuccessMessage(state.checkout.response)
                );
                setFeedbackState(checkoutResult, "hidden");
            } else {
                setFeedbackState(
                    checkoutResult,
                    "error",
                    state.checkout.response.mensagem || "Não foi possível enviar o checkout link."
                );
                setFeedbackState(successFeedback, "hidden");
            }
        } else {
            toggleCheckoutSuccessState(false);
            setFeedbackState(checkoutResult, "hidden");
            setFeedbackState(successFeedback, "hidden");
        }
    }

    function renderCurrentStep(step) {
        var currentStep = step || 2;

        togglePanel("step-2", currentStep === 2);
        togglePanel("step-3", currentStep === 3);
        togglePanel("step-4", currentStep === 4);
        updateProgressStep(currentStep);
    }

    function updateProgressStep(step) {
        var nodes = document.querySelectorAll("[data-progress-step]");
        nodes.forEach(function (node) {
            var nodeStep = Number(node.getAttribute("data-progress-step"));
            node.classList.remove("active");
            node.classList.remove("done");

            if (nodeStep < step) {
                node.classList.add("done");
            } else if (nodeStep === step) {
                node.classList.add("active");
            }
        });
    }

    function togglePanel(id, visible) {
        var node = document.getElementById(id);
        if (!node) {
            return;
        }

        if (visible) {
            showElement(node);
        } else {
            hideElement(node);
        }
    }

    function validateConsultaData(data) {
        var errors = {};

        if (!data.renavam) {
            errors.renavam = "Informe o RENAVAM.";
        } else if (!/^\d{11}$/.test(data.renavam)) {
            errors.renavam = "O RENAVAM deve conter 11 dígitos numéricos.";
        }

        if (!data.email) {
            errors.email = "Informe o e-mail.";
        } else if (!isValidEmail(data.email)) {
            errors.email = "Informe um e-mail válido.";
        }

        return errors;
    }

    function validatePersonalData(personal) {
        var errors = {};
        var phoneDigits = getPhoneDigits(personal.telefone);

        if (!personal.nome) {
            errors.nome = "Informe o nome completo.";
        } else if (personal.nome.length < 5 || personal.nome.indexOf(" ") < 1) {
            errors.nome = "Informe nome e sobrenome.";
        }

        if (!personal.cep) {
            errors.cep = "Informe o CEP.";
        } else if (!/^\d{5}-\d{3}$/.test(personal.cep)) {
            errors.cep = "Informe um CEP válido.";
        }

        if (!personal.numero) {
            errors.numero = "Informe o número.";
        }

        if (!personal.complemento) {
            errors.complemento = "Informe o complemento.";
        }

        if (!personal.logradouro) {
            errors.logradouro = "Informe o logradouro.";
        }

        if (!personal.bairro) {
            errors.bairro = "Informe o bairro.";
        }

        if (!personal.cidade) {
            errors.cidade = "Informe a cidade.";
        }

        if (!personal.uf) {
            errors.uf = "Informe a UF.";
        } else if (!/^[A-Z]{2}$/.test(personal.uf)) {
            errors.uf = "Informe uma UF válida.";
        }

        if (!personal.email) {
            errors.email = "Informe o e-mail.";
        } else if (!isValidEmail(personal.email)) {
            errors.email = "Informe um e-mail válido.";
        }

        if (!personal.confirmEmail) {
            errors.confirmEmail = "Confirme o e-mail.";
        } else if (personal.confirmEmail !== personal.email) {
            errors.confirmEmail = "A confirmação deve ser igual ao e-mail.";
        }

        if (!phoneDigits) {
            errors.telefone = "Informe o telefone.";
        } else if (phoneDigits.length < 10 || phoneDigits.length > 11) {
            errors.telefone = "Informe um telefone válido com DDD.";
        }

        return errors;
    }

    function applyFieldErrors(form, errors) {
        Object.keys(errors).forEach(function (key) {
            var input = form.querySelector('[name="' + key + '"]') || form.querySelector("#" + key);
            var errorNode = form.querySelector('[data-error-for="' + key + '"]');

            if (input) {
                input.classList.add("input-error");
                input.setAttribute("aria-invalid", "true");
            }

            if (errorNode) {
                errorNode.textContent = errors[key];
            }
        });
    }

    function clearFieldErrors(form) {
        form.querySelectorAll(".input-error").forEach(function (node) {
            node.classList.remove("input-error");
            node.removeAttribute("aria-invalid");
        });

        form.querySelectorAll(".field-error").forEach(function (node) {
            node.textContent = "";
        });
    }

    function clearFieldError(form, key) {
        if (!form || !key) {
            return;
        }

        var input = form.querySelector('[name="' + key + '"]') || form.querySelector("#" + key);
        var errorNode = form.querySelector('[data-error-for="' + key + '"]');

        if (input) {
            input.classList.remove("input-error");
            input.removeAttribute("aria-invalid");
        }

        if (errorNode) {
            errorNode.textContent = "";
        }
    }

    function ensureDefaultSelections(state) {
        var items = (state.consulta && state.consulta.debtItems) || [];
        items.forEach(function (item) {
            item.id = safeText(item.id);
            item.group = safeText(item.group || "Débitos");
            item.title = safeText(item.title || "Débito");
            item.description = safeText(item.description || "Descrição indisponível");
            item.dateLabel = safeText(item.dateLabel || "Data indisponível");
            item.amount = roundCurrency(item.amount);
            if (typeof item.selected !== "boolean") {
                item.selected = true;
            }
            item.required = !!item.required;
        });

        if (!state.consulta.paymentOptionId || !hasPaymentOption(state.consulta.paymentOptionId)) {
            state.consulta.paymentOptionId = PAYMENT_OPTIONS[0].id;
        }

        if (!state.pessoal) {
            state.pessoal = {
                nome: "",
                cep: "",
                numero: "",
                complemento: "",
                logradouro: "",
                bairro: "",
                cidade: "",
                uf: "",
                email: state.consulta.email || "",
                confirmEmail: state.consulta.email || "",
                telefone: ""
            };
        }

        state.pessoal = sanitizePersonalData(state.pessoal);
    }

    function buildDebtItems(data) {
        var items = [];
        var ipvas = Array.isArray(data.ipvas) ? data.ipvas : [];
        var multas = Array.isArray(data.multas) ? data.multas : [];
        var detailedTotal = 0;

        ipvas.forEach(function (ipva) {
            var amount = roundCurrency(ipva.valor);
            detailedTotal += amount;
            items.push({
                id: "ipva-" + String(ipva.execicio || items.length + 1),
                group: "IPVA",
                title: "IPVA " + String(ipva.execicio || ""),
                description: "Vencimento",
                dateLabel: formatDate(ipva.vencimento),
                amount: amount,
                selected: true,
                required: false
            });
        });

        multas.forEach(function (multa, index) {
            var amount = roundCurrency(multa.valor);
            detailedTotal += amount;
            items.push({
                id: "multa-" + String(multa.aiip || index + 1),
                group: "Multas",
                title: safeText(multa.descricaoEnquadramento || "Multa de trânsito"),
                description: multa.municipioInfracao ? "Infração em " + safeText(multa.municipioInfracao) : "Infração registrada",
                dateLabel: formatDate(multa.vencimento || multa.dataInfracao),
                amount: amount,
                selected: true,
                required: false
            });
        });

        var total = roundCurrency(data.valorTotal);
        var mainAmount = roundCurrency(total - detailedTotal);

        if (mainAmount > 0 || !items.length) {
            items.unshift({
                id: "servico-principal",
                group: "Licenciamento",
                title: safeText(data.servico || "Licenciamento"),
                description: "Serviço principal retornado na consulta",
                dateLabel: "Valor consolidado",
                amount: mainAmount > 0 ? mainAmount : total,
                selected: true,
                required: !items.length
            });
        }

        return items;
    }

    function buildCheckoutDescription(state, selectedItems) {
        var vehicle = state.consulta.response.veiculo || {};
        var labels = selectedItems.map(function (item) {
            return safeText(item.title);
        }).slice(0, 3).join(", ");
        var vehicleLabel = safeText(vehicle.placa || state.consulta.renavam);
        return "Checkout de débitos " + vehicleLabel + " - " + labels;
    }

    function buildCheckoutServicesLabel(selectedItems) {
        return selectedItems.map(function (item) {
            return safeText(item.title);
        }).filter(Boolean).join(", ");
    }

    function getSelectedPaymentOption(state) {
        var option = PAYMENT_OPTIONS.find(function (entry) {
            return entry.id === state.consulta.paymentOptionId;
        });

        return option || PAYMENT_OPTIONS[0];
    }

    function getSelectedDebtItems(state) {
        return ((state.consulta && state.consulta.debtItems) || []).filter(function (item) {
            return !!item.selected;
        });
    }

    function calculateSelectedTotal(state) {
        return roundCurrency(getSelectedDebtItems(state).reduce(function (total, item) {
            return total + roundCurrency(item.amount);
        }, 0));
    }

    function findDebtItem(state, debtId) {
        return ((state.consulta && state.consulta.debtItems) || []).find(function (item) {
            return item.id === debtId;
        });
    }

    async function postConsulta(renavam) {
        return httpClient.request("/consulta?renavam=" + encodeURIComponent(renavam), {
            method: "POST"
        });
    }

    async function postCheckout(payload) {
        return httpClient.request("/pagamentos/checkout-link", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json"
            },
            body: JSON.stringify(payload)
        });
    }

    async function getCepAddress(cep) {
        return cepHttpClient.request("/enderecos/cep/" + encodeURIComponent(cep), {
            method: "GET"
        });
    }

    function resolveApiBase() {
        var runtimeOverride = typeof window !== "undefined" ? safeText(window.SIGA_API_BASE || "") : "";
        var hostname = typeof window !== "undefined" && window.location ? window.location.hostname : "";
        var protocol = typeof window !== "undefined" && window.location ? window.location.protocol : "";

        if (runtimeOverride) {
            return runtimeOverride.replace(/\/+$/, "");
        }

        if (!protocol || protocol === "file:" || hostname === "localhost" || hostname === "127.0.0.1") {
            return "http://localhost:8080";
        }

        return "https://api.sigabr.online";
    }

    function resolveCepApiBase() {
        var runtimeOverride = typeof window !== "undefined" ? safeText(window.SIGA_CEP_API_BASE || "") : "";
        return runtimeOverride ? runtimeOverride.replace(/\/+$/, "") : API_BASE;
    }

    function createHttpClient(baseUrl) {
        return {
            request: async function (path, options) {
                var requestOptions = options || {};
                var headers = Object.assign({
                    "Accept": "application/json"
                }, requestOptions.headers || {});
                var controller = typeof AbortController === "function" ? new AbortController() : null;
                var timeoutId = controller ? window.setTimeout(function () {
                    controller.abort();
                }, REQUEST_TIMEOUT_MS) : null;
                var response;
                var data;

                try {
                    response = await fetch(baseUrl + path, {
                        method: requestOptions.method || "POST",
                        headers: headers,
                        body: requestOptions.body,
                        signal: controller ? controller.signal : undefined
                    });
                } catch (error) {
                    if (timeoutId) {
                        window.clearTimeout(timeoutId);
                    }

                    if (error && error.name === "AbortError") {
                        throw new Error("A requisição expirou. Tente novamente em instantes.");
                    }

                    throw new Error("Não foi possível conectar ao serviço no momento.");
                }

                if (timeoutId) {
                    window.clearTimeout(timeoutId);
                }

                data = await parseResponse(response);

                if (!response.ok) {
                    throw new Error(extractErrorMessage(data, response.status));
                }

                return data;
            }
        };
    }

    async function parseResponse(response) {
        var contentType = response.headers.get("content-type") || "";

        if (contentType.indexOf("application/json") >= 0) {
            return response.json().catch(function () {
                return null;
            });
        }

        return response.text().catch(function () {
            return "";
        });
    }

    function extractErrorMessage(data, status) {
        if (data && typeof data === "object") {
            if (typeof data.message === "string" && data.message) {
                return data.message;
            }

            if (typeof data.mensagem === "string" && data.mensagem) {
                return data.mensagem;
            }

            if (Array.isArray(data.errors) && data.errors.length) {
                return String(data.errors[0]);
            }
        }

        if (typeof data === "string" && data.trim()) {
            return data.trim();
        }

        if (status === 400) {
            return "Os dados enviados são inválidos.";
        }

        if (status === 403) {
            return "A operação foi negada pelo serviço.";
        }

        if (status === 502 || status === 503 || status === 504) {
            return "O serviço está indisponível no momento. Tente novamente em instantes.";
        }

        return "Erro inesperado na integração.";
    }

    function readState() {
        try {
            var raw = window.sessionStorage.getItem(STORAGE_KEY);
            if (raw) {
                return sanitizeState(JSON.parse(raw));
            }

            var legacyRaw = window.localStorage.getItem(LEGACY_STORAGE_KEY);
            if (!legacyRaw) {
                return {};
            }

            var parsed = sanitizeState(JSON.parse(legacyRaw));
            window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
            window.localStorage.removeItem(LEGACY_STORAGE_KEY);
            return parsed;
        } catch (error) {
            return {};
        }
    }

    function saveState(state) {
        var sanitized = sanitizeState(state);
        window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(sanitized));
    }

    function sanitizeState(state) {
        var nextState = state && typeof state === "object" ? state : {};

        if (nextState.consulta) {
            nextState.consulta.renavam = sanitizeRenavam(nextState.consulta.renavam);
            nextState.consulta.email = normalizeEmail(nextState.consulta.email);
            nextState.consulta.estado = safeTrim(nextState.consulta.estado);
            nextState.consulta.response = sanitizeConsultaResponse(nextState.consulta.response || {});
            nextState.consulta.debtItems = Array.isArray(nextState.consulta.debtItems) ? nextState.consulta.debtItems.map(function (item) {
                return {
                    id: safeText(item.id),
                    group: safeText(item.group || "Débitos"),
                    title: safeText(item.title || "Débito"),
                    description: safeText(item.description || "Descrição indisponível"),
                    dateLabel: safeText(item.dateLabel || "Data indisponível"),
                    amount: roundCurrency(item.amount),
                    selected: !!item.selected,
                    required: !!item.required
                };
            }) : [];
            if (!hasPaymentOption(nextState.consulta.paymentOptionId)) {
                nextState.consulta.paymentOptionId = PAYMENT_OPTIONS[0].id;
            }
        }

        nextState.pessoal = sanitizePersonalData(nextState.pessoal || {});
        nextState.etapaAtual = [2, 3, 4].indexOf(Number(nextState.etapaAtual)) >= 0 ? Number(nextState.etapaAtual) : 2;

        if (nextState.checkout && nextState.checkout.response) {
            nextState.checkout.response = sanitizeCheckoutResponse(nextState.checkout.response);
            nextState.checkout.protocol = limitText(safeText(nextState.checkout.protocol), 120);
            nextState.checkout.maskedEmail = limitText(safeText(nextState.checkout.maskedEmail), 120);
        } else {
            nextState.checkout = null;
        }

        return nextState;
    }

    function sanitizeConsultaResponse(data) {
        var source = data && typeof data === "object" ? data : {};
        var vehicle = source.veiculo && typeof source.veiculo === "object" ? source.veiculo : {};

        return {
            identificador: limitText(safeText(source.identificador), 60),
            servico: limitText(safeText(source.servico), 80),
            valorTotal: roundCurrency(source.valorTotal),
            ipvas: Array.isArray(source.ipvas) ? source.ipvas.map(function (item) {
                return {
                    execicio: safeText(item.execicio),
                    valor: roundCurrency(item.valor),
                    vencimento: item.vencimento || null
                };
            }) : [],
            multas: Array.isArray(source.multas) ? source.multas.map(function (item) {
                return {
                    aiip: safeText(item.aiip),
                    valor: roundCurrency(item.valor),
                    descricaoEnquadramento: limitText(safeText(item.descricaoEnquadramento), 120),
                    municipioInfracao: limitText(safeText(item.municipioInfracao), 80),
                    vencimento: item.vencimento || null,
                    dataInfracao: item.dataInfracao || null
                };
            }) : [],
            veiculo: {
                proprietario: limitText(safeText(vehicle.proprietario), 80),
                placa: limitText(safeText(vehicle.placa), 20),
                renavam: sanitizeRenavam(vehicle.renavam).slice(0, 11),
                municipioDescricao: limitText(safeText(vehicle.municipioDescricao), 60),
                uf: limitText(safeText(vehicle.uf), 2)
            }
        };
    }

    function sanitizeCheckoutResponse(data) {
        var source = data && typeof data === "object" ? data : {};
        return {
            sucesso: source.sucesso !== false,
            mensagem: limitText(safeText(source.mensagem), 220),
            protocolo: limitText(safeText(source.protocolo), 120),
            linkGerado: limitText(safeText(source.linkGerado), 500),
            emailEnviado: source.emailEnviado === true,
            observacao: limitText(safeText(source.observacao), 220)
        };
    }

    function toggleCheckoutSuccessState(success) {
        togglePanel("checkout-review-state", !success);
        togglePanel("checkout-success-state", !!success);
    }

    function setSuccessSummary(state) {
        var checkout = state.checkout || {};
        var response = checkout.response || {};
        var statusText = response.sucesso === false
            ? "Falha no envio"
            : response.emailEnviado
                ? "Solicitação concluída"
                : "Link gerado com observação";

        setText("success-email", checkout.maskedEmail || maskEmail((state.pessoal && state.pessoal.email) || state.consulta.email || ""));
        setText("success-protocol", response.protocolo || checkout.protocol || "-");
        setText("success-status", statusText);
    }

    function buildCheckoutSuccessMessage(response) {
        var parts = [];
        var source = response && typeof response === "object" ? response : {};

        if (source.mensagem) {
            parts.push(source.mensagem);
        }

        if (source.observacao) {
            parts.push(source.observacao);
        }

        return parts.join(" ").trim() || "Checkout link enviado por e-mail.";
    }

    function extractCheckoutProtocol(response, payload) {
        var source = response && typeof response === "object" ? response : {};
        var directProtocol = source.protocolo || source.identificacao || source.operacaoId || source.acesso;
        var messageProtocol = extractProtocolFromMessage(source.mensagem);
        var fallback = payload && payload.identificacao ? payload.identificacao : "";
        return limitText(safeText(directProtocol || messageProtocol || fallback), 120) || "-";
    }

    function extractProtocolFromMessage(message) {
        var text = safeText(message);
        var tokenMatch = text.match(/(?:token|protocolo|identifica(?:c|ç)ão)\s*:\s*([a-z0-9-]+)/i);
        return tokenMatch ? tokenMatch[1] : "";
    }

    function maskEmail(email) {
        var normalized = normalizeEmail(email);
        var parts = normalized.split("@");
        var localPart;

        if (parts.length !== 2 || !parts[0] || !parts[1]) {
            return "-";
        }

        localPart = parts[0];

        if (localPart.length <= 2) {
            return localPart.charAt(0) + "*@" + parts[1];
        }

        return localPart.slice(0, 2) + "***" + localPart.slice(-1) + "@" + parts[1];
    }

    function extractCheckoutEmail(response, fallbackEmail) {
        var source = response && typeof response === "object" ? response : {};
        var directEmail = source.email || source.emailMascarado || source.destinatario;
        return maskEmail(directEmail || fallbackEmail);
    }

    function resetPaymentFlow() {
        window.sessionStorage.removeItem(STORAGE_KEY);
        window.localStorage.removeItem(LEGACY_STORAGE_KEY);
        window.location.href = "consulta.html";
    }

    function sanitizePersonalData(personal) {
        var source = personal && typeof personal === "object" ? personal : {};
        var sanitized = {
            nome: limitText(normalizeSpaces(source.nome), 120),
            cep: formatCep(source.cep),
            numero: limitText(normalizeSpaces(source.numero), 20),
            complemento: limitText(normalizeSpaces(source.complemento), 120),
            logradouro: limitText(normalizeSpaces(source.logradouro), 255),
            bairro: limitText(normalizeSpaces(source.bairro), 120),
            cidade: limitText(normalizeSpaces(source.cidade), 120),
            uf: normalizeStateCode(source.uf),
            email: normalizeEmail(source.email),
            confirmEmail: normalizeEmail(source.confirmEmail),
            telefone: formatPhone(source.telefone)
        };

        sanitized.endereco = limitText(buildPersonalAddress(sanitized) || normalizeSpaces(source.endereco), 180);
        return sanitized;
    }

    async function fetchAddressByCep(form, lookupState) {
        var cepInput = document.getElementById("delivery-cep");
        var button = document.getElementById("lookup-cep");
        var feedbackNode = document.getElementById("cep-feedback");
        var cep = sanitizeCep(cepInput ? cepInput.value : "");

        await runExclusive(lookupState, async function () {
            if (!cep) {
                clearAddressLookupFields();
                setAddressFieldsReadonly(false);
                clearFieldError(form, "cep");
                applyFieldErrors(form, {
                    cep: "Informe o CEP."
                });
                setFeedbackState(feedbackNode, "error", "Informe o CEP para buscar o endereço.");
                return;
            }

            if (!/^\d{8}$/.test(cep)) {
                clearAddressLookupFields();
                setAddressFieldsReadonly(false);
                clearFieldError(form, "cep");
                applyFieldErrors(form, {
                    cep: "Informe um CEP válido."
                });
                setFeedbackState(feedbackNode, "error", "O CEP precisa ter 8 dígitos.");
                return;
            }

            clearFieldError(form, "cep");
            setLoading(button, true, "Buscando...");
            setFeedbackState(feedbackNode, "loading", "Consultando endereço pelo CEP...");

            try {
                var response = await getCepAddress(cep);
                if (response && response.encontrado === false) {
                    clearAddressLookupFields();
                    setAddressFieldsReadonly(false);
                    setFeedbackState(feedbackNode, "error", "CEP não localizado. Preencha logradouro, bairro, cidade e UF manualmente.");
                    return;
                }

                applyAddressLookupResponse(response);
                clearFieldError(form, "logradouro");
                clearFieldError(form, "bairro");
                clearFieldError(form, "cidade");
                clearFieldError(form, "uf");
                setFeedbackState(feedbackNode, "success", "Endereço preenchido a partir do CEP.");
            } catch (error) {
                clearAddressLookupFields();
                setAddressFieldsReadonly(false);
                setFeedbackState(feedbackNode, "error", getErrorMessage(error) + " Você pode preencher o endereço manualmente.");
            } finally {
                setLoading(button, false);
            }
        });
    }

    function applyAddressLookupResponse(data) {
        var response = data && typeof data === "object" ? data : {};
        var current = sanitizePersonalData({
            cep: response.cep,
            numero: document.getElementById("delivery-number").value,
            complemento: document.getElementById("delivery-complement").value,
            logradouro: response.logradouro,
            bairro: response.bairro,
            cidade: response.cidade || response.localidade,
            uf: response.uf
        });

        document.getElementById("delivery-cep").value = current.cep;
        document.getElementById("delivery-street").value = current.logradouro;
        document.getElementById("delivery-neighborhood").value = current.bairro;
        document.getElementById("delivery-city").value = current.cidade;
        document.getElementById("delivery-state").value = current.uf;

        setAddressFieldsReadonly(true);
    }

    function clearAddressLookupFields() {
        var fieldIds = [
            "delivery-street",
            "delivery-neighborhood",
            "delivery-city",
            "delivery-state"
        ];

        fieldIds.forEach(function (id) {
            var node = document.getElementById(id);
            if (node) {
                node.value = "";
            }
        });
    }

    function setAddressFieldsReadonly(readonly) {
        [
            "delivery-street",
            "delivery-neighborhood",
            "delivery-city",
            "delivery-state"
        ].forEach(function (id) {
            var node = document.getElementById(id);
            if (!node) {
                return;
            }

            if (readonly) {
                node.setAttribute("readonly", "readonly");
            } else {
                node.removeAttribute("readonly");
            }
        });
    }

    function hasLookupAddress(personal) {
        return !!(personal && personal.logradouro && personal.bairro && personal.cidade && personal.uf);
    }

    function buildPersonalAddress(personal) {
        var source = personal && typeof personal === "object" ? personal : {};
        var line1 = [source.logradouro, source.numero].filter(Boolean).join(", ");
        var line2 = [source.complemento, source.bairro].filter(Boolean).join(" - ");
        var line3 = [source.cidade, source.uf].filter(Boolean).join("/");
        var line4 = source.cep || "";

        return [line1, line2, line3, line4].filter(Boolean).join(", ");
    }

    function sanitizeCep(value) {
        return String(value || "").replace(/\D/g, "").slice(0, 8);
    }

    function formatCep(value) {
        var digits = sanitizeCep(value);

        if (digits.length <= 5) {
            return digits;
        }

        return digits.slice(0, 5) + "-" + digits.slice(5);
    }

    function normalizeStateCode(value) {
        return safeTrim(value).replace(/[^a-z]/gi, "").toUpperCase().slice(0, 2);
    }

    function showElement(node) {
        if (node) {
            node.classList.remove("hidden");
        }
    }

    function hideElement(node) {
        if (node) {
            node.classList.add("hidden");
        }
    }

    function setFeedbackState(node, type, message) {
        if (!node) {
            return;
        }

        if (!type || type === "hidden") {
            node.className = "feedback hidden";
            node.textContent = "";
            return;
        }

        node.className = "feedback feedback-" + type;
        node.textContent = message || "";
    }

    function setLoading(button, active, label) {
        if (!button) {
            return;
        }

        if (!button.dataset.originalLabel) {
            button.dataset.originalLabel = button.textContent;
        }

        button.disabled = !!active;
        button.setAttribute("aria-busy", active ? "true" : "false");
        button.textContent = active ? label : button.dataset.originalLabel;
    }

    function createDebtItemNode(item) {
        var label = createElement("label", {
            className: "debt-item interactive" + (item.required ? " debt-item-required" : "")
        });
        var info = createElement("div", { className: "debt-info" });
        var title = createElement("h4", { text: item.title });
        var description = createElement("p", { text: item.description });
        var amount = createElement("div", { className: "debt-amount", text: formatCurrency(item.amount) });
        var date = createElement("div", { className: "debt-date", text: item.dateLabel });
        var checkWrapper = createElement("div", { className: "debt-check" });
        var input = document.createElement("input");

        input.type = "checkbox";
        input.setAttribute("data-debt-id", item.id);
        input.checked = !!item.selected;
        input.disabled = !!item.required;
        input.setAttribute("aria-label", item.title);

        info.appendChild(title);
        info.appendChild(description);
        checkWrapper.appendChild(input);

        label.appendChild(info);
        label.appendChild(amount);
        label.appendChild(date);
        label.appendChild(checkWrapper);

        return label;
    }

    function createPaymentOptionNode(option, checked) {
        var label = createElement("label", { className: "payment-option" });
        var input = document.createElement("input");
        var wrapper = document.createElement("div");
        var strong = document.createElement("strong");
        var paragraph = document.createElement("p");

        input.type = "radio";
        input.name = "payment-option";
        input.value = option.id;
        input.checked = !!checked;

        strong.textContent = option.label;
        paragraph.textContent = option.description;

        wrapper.appendChild(strong);
        wrapper.appendChild(paragraph);
        label.appendChild(input);
        label.appendChild(wrapper);

        return label;
    }

    function createSummaryItemNode(label, value) {
        var item = createElement("div", { className: "summary-item" });
        item.appendChild(createElement("span", { text: label }));
        item.appendChild(createElement("span", { text: value }));
        return item;
    }

    function createElement(tagName, options) {
        var node = document.createElement(tagName);
        var settings = options || {};

        if (settings.className) {
            node.className = settings.className;
        }

        if (typeof settings.text === "string") {
            node.textContent = settings.text;
        }

        return node;
    }

    function clearChildren(node) {
        if (!node) {
            return;
        }

        while (node.firstChild) {
            node.removeChild(node.firstChild);
        }
    }

    function setText(id, value) {
        var node = document.getElementById(id);
        if (node) {
            node.textContent = value;
        }
    }

    function syncPersonalInputs(personal) {
        document.getElementById("full-name").value = personal.nome;
        document.getElementById("delivery-cep").value = personal.cep;
        document.getElementById("delivery-number").value = personal.numero;
        document.getElementById("delivery-complement").value = personal.complemento;
        document.getElementById("delivery-street").value = personal.logradouro;
        document.getElementById("delivery-neighborhood").value = personal.bairro;
        document.getElementById("delivery-city").value = personal.cidade;
        document.getElementById("delivery-state").value = personal.uf;
        document.getElementById("personal-email").value = personal.email;
        document.getElementById("personal-email-confirm").value = personal.confirmEmail;
        document.getElementById("personal-phone").value = personal.telefone;
        setAddressFieldsReadonly(hasLookupAddress(personal));
    }

    function createSubmitGuard() {
        return {
            locked: false
        };
    }

    async function runExclusive(guard, callback) {
        if (!guard || guard.locked) {
            return;
        }

        guard.locked = true;
        try {
            await callback();
        } finally {
            guard.locked = false;
        }
    }

    function debounce(callback, wait, immediate) {
        var timeoutId = null;

        return function () {
            var context = this;
            var args = arguments;
            var callNow = immediate && !timeoutId;

            window.clearTimeout(timeoutId);
            timeoutId = window.setTimeout(function () {
                timeoutId = null;
                if (!immediate) {
                    callback.apply(context, args);
                }
            }, wait);

            if (callNow) {
                callback.apply(context, args);
            }
        };
    }

    function sanitizeRenavam(value) {
        return String(value || "").replace(/\D/g, "").slice(0, 11);
    }

    function normalizeEmail(value) {
        return safeTrim(value).toLowerCase();
    }

    function normalizeSpaces(value) {
        return safeTrim(value).replace(/\s+/g, " ");
    }

    function safeTrim(value) {
        return String(value == null ? "" : value).trim();
    }

    function safeText(value) {
        return String(value == null ? "" : value).replace(/[\u0000-\u001F\u007F]/g, "").trim();
    }

    function limitText(value, maxLength) {
        var text = safeText(value);
        return text.length > maxLength ? text.slice(0, maxLength) : text;
    }

    function hasPaymentOption(optionId) {
        return PAYMENT_OPTIONS.some(function (option) {
            return option.id === optionId;
        });
    }

    function isValidEmail(value) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
    }

    function getPhoneDigits(value) {
        return String(value || "").replace(/\D/g, "");
    }

    function formatCurrency(value) {
        return new Intl.NumberFormat("pt-BR", {
            style: "currency",
            currency: "BRL"
        }).format(roundCurrency(value));
    }

    function roundCurrency(value) {
        return Math.round((Number(value) || 0) * 100) / 100;
    }

    function formatDateTime(value) {
        if (!value) {
            return "-";
        }

        var date = new Date(value);
        if (Number.isNaN(date.getTime())) {
            return "-";
        }

        return new Intl.DateTimeFormat("pt-BR", {
            dateStyle: "short",
            timeStyle: "short"
        }).format(date);
    }

    function formatDate(value) {
        if (!value) {
            return "Data indisponível";
        }

        if (typeof value === "string") {
            var parsed = new Date(value);
            if (!Number.isNaN(parsed.getTime())) {
                return parsed.toLocaleDateString("pt-BR");
            }
        }

        if (typeof value === "object" && value.year && value.month && value.day) {
            return new Date(value.year, value.month - 1, value.day).toLocaleDateString("pt-BR");
        }

        return "Data indisponível";
    }

    function formatPhone(value) {
        var digits = getPhoneDigits(value).slice(0, 11);

        if (digits.length <= 2) {
            return digits ? "(" + digits : "";
        }

        if (digits.length <= 7) {
            return "(" + digits.slice(0, 2) + ") " + digits.slice(2);
        }

        if (digits.length <= 10) {
            return "(" + digits.slice(0, 2) + ") " + digits.slice(2, 6) + "-" + digits.slice(6);
        }

        return "(" + digits.slice(0, 2) + ") " + digits.slice(2, 7) + "-" + digits.slice(7);
    }

    function getErrorMessage(error) {
        return error && error.message ? error.message : "Não foi possível concluir a operação.";
    }
})();
