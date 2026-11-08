/* Africontinent Global — site behaviour (vanilla JS) */
(function () {
  "use strict";
  var doc = document.documentElement;
  doc.classList.add("js");
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ---------- Photo fallback: hide broken images, keep the navy backdrop ---------- */
  $$(".photo > img").forEach(function (img) {
    var fail = function () { img.classList.add("failed"); };
    img.addEventListener("error", fail);
    if (img.complete && img.naturalWidth === 0 && img.src) fail();
  });

  /* ---------- 1. Welcome intro ---------- */
  var intro = $("#intro");
  var seen = false;
  try { seen = sessionStorage.getItem("acg_intro_seen") === "1"; } catch (e) {}

  function closeIntro() {
    if (!intro || intro.classList.contains("leaving")) return;
    try { sessionStorage.setItem("acg_intro_seen", "1"); } catch (e) {}
    intro.classList.add("leaving");
    document.body.classList.remove("locked");
    setTimeout(function () { intro.hidden = true; startReveals(); }, reduceMotion ? 250 : 1150);
  }

  if (intro) {
    if (seen) {
      intro.hidden = true;
    } else {
      document.body.classList.add("locked");
      var word = $("#introWord");
      var letters = word.textContent.trim().split("");
      word.textContent = "";
      letters.forEach(function (ch, i) {
        var s = document.createElement("span");
        s.textContent = ch;
        s.style.animationDelay = (0.9 + i * 0.07) + "s";
        word.appendChild(s);
      });
      $("#introEnter").addEventListener("click", closeIntro);
      $("#introSkip").addEventListener("click", closeIntro);
      var introTimer = setTimeout(closeIntro, reduceMotion ? 1500 : 6000);
      /* Choosing a language on the welcome screen switches the site, then opens it */
      $$("#intro .lang button").forEach(function (b) {
        b.addEventListener("click", function () {
          clearTimeout(introTimer);
          setLang(b.dataset.lang);
          setTimeout(closeIntro, reduceMotion ? 100 : 650);
        });
      });
      document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeIntro(); });
    }
  }

  /* ---------- 2. Header: solid on scroll, active link, back-to-top ---------- */
  var header = $("#header");
  var toTop = $("#toTop");
  var heroImg = $("#heroImg");
  var ticking = false;
  function onScroll() {
    var y = window.scrollY || window.pageYOffset;
    header.classList.toggle("scrolled", y > 40);
    toTop.classList.toggle("show", y > 700);
    if (heroImg && !reduceMotion && y < window.innerHeight * 1.2) {
      heroImg.style.transform = "scale(1.08) translateY(" + (y * 0.18) + "px)";
    }
    ticking = false;
  }
  window.addEventListener("scroll", function () { if (!ticking) { requestAnimationFrame(onScroll); ticking = true; } }, { passive: true });
  onScroll();
  toTop.addEventListener("click", function () { window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" }); });

  /* Highlight the current page in the nav */
  var page = (location.pathname.split("/").pop() || "index.html").toLowerCase();
  if (page.indexOf(".html") === -1) page = "index.html";
  $$(".nav-links a, .mobile-menu a").forEach(function (a) {
    var href = (a.getAttribute("href") || "").split("#")[0].toLowerCase();
    a.classList.toggle("active", href === page);
    if (href === page) a.setAttribute("aria-current", "page");
  });
  var sections = $$("main section[id]");
  var navLinks = $$(".nav-links a[href^='#']");
  if (navLinks.length && "IntersectionObserver" in window) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          navLinks.forEach(function (a) { a.classList.toggle("active", a.getAttribute("href") === "#" + en.target.id); });
        }
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    sections.forEach(function (s) { spy.observe(s); });
  }

  /* ---------- Mobile menu ---------- */
  var burger = $("#burger");
  function setMenu(open) {
    doc.classList.toggle("menu-open", open);
    burger.setAttribute("aria-expanded", open ? "true" : "false");
    burger.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    document.body.classList.toggle("locked", open);
  }
  burger.addEventListener("click", function () { setMenu(!doc.classList.contains("menu-open")); });
  $$("#mobileMenu a").forEach(function (a) { a.addEventListener("click", function () { setMenu(false); }); });
  window.addEventListener("resize", function () { if (window.innerWidth > 960) setMenu(false); });

  /* ---------- Scroll reveals (content is visible by default) ---------- */
  var revealsStarted = false;
  function startReveals() {
    if (revealsStarted || reduceMotion || !("IntersectionObserver" in window)) return;
    revealsStarted = true;
    var vh = window.innerHeight;
    var items = $$(".reveal").filter(function (el) { return el.getBoundingClientRect().top > vh * 0.9; });
    items.forEach(function (el) { el.classList.add("pending"); });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var el = en.target;
        var sibs = Array.prototype.indexOf.call(el.parentNode.children, el);
        el.style.transitionDelay = Math.min(sibs, 6) * 70 + "ms";
        el.classList.remove("pending");
        io.unobserve(el);
      });
    }, { rootMargin: "0px 0px -8% 0px" });
    items.forEach(function (el) { io.observe(el); });
  }
  if (!intro || intro.hidden) startReveals();

  /* How-it-works dotted line + stat counters */
  if ("IntersectionObserver" in window) {
    var steps = $("#steps");
    if (steps) new IntersectionObserver(function (en, obs) {
      if (en[0].isIntersecting) { steps.classList.add("in"); obs.disconnect(); }
    }, { threshold: 0.3 }).observe(steps);

    var counters = $$("[data-count]");
    var cio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var el = en.target, end = +el.dataset.count, suf = el.dataset.suffix || "";
        cio.unobserve(el);
        if (reduceMotion) return;
        var t0 = performance.now(), dur = 1800;
        (function tick(t) {
          var p = Math.min((t - t0) / dur, 1), e = 1 - Math.pow(1 - p, 3);
          el.textContent = Math.round(end * e).toLocaleString("en-ZA").replace(/ /g, ",") + suf;
          if (p < 1) requestAnimationFrame(tick);
        })(t0);
      });
    }, { threshold: 0.5 });
    counters.forEach(function (c) { cio.observe(c); });
  } else if ($("#steps")) {
    $("#steps").classList.add("in");
  }

  /* ---------- Testimonials slider ---------- */
  var slides = $("#slides"), dotsWrap = $("#dots"), slider = $("#slider");
  if (slides) (function () {
  var count = slides.children.length, idx = 0, timer;
  for (var i = 0; i < count; i++) {
    var b = document.createElement("button");
    b.type = "button"; b.setAttribute("role", "tab"); b.setAttribute("aria-label", "Testimonial " + (i + 1));
    b.addEventListener("click", (function (n) { return function () { go(n); restart(); }; })(i));
    dotsWrap.appendChild(b);
  }
  function go(n) {
    idx = (n + count) % count;
    slides.style.transform = "translateX(" + (-idx * 100) + "%)";
    $$("button", dotsWrap).forEach(function (d, j) { d.classList.toggle("on", j === idx); d.setAttribute("aria-selected", j === idx); });
  }
  function restart() { clearInterval(timer); if (!reduceMotion) timer = setInterval(function () { go(idx + 1); }, 6000); }
  go(0); restart();
  var x0 = null;
  slider.addEventListener("touchstart", function (e) { x0 = e.touches[0].clientX; }, { passive: true });
  slider.addEventListener("touchend", function (e) {
    if (x0 === null) return;
    var dx = e.changedTouches[0].clientX - x0;
    if (Math.abs(dx) > 40) { go(idx + (dx < 0 ? 1 : -1)); restart(); }
    x0 = null;
  });
  slider.addEventListener("mouseenter", function () { clearInterval(timer); });
  slider.addEventListener("mouseleave", restart);
  })();

  /* ---------- Product links pre-fill the contact form (contact.html?product=...) ---------- */
  $$("[data-product]").forEach(function (card) {
    card.addEventListener("click", function () {
      var sel = $("#f-product");
      if (sel) sel.value = card.dataset.product;
    });
  });
  try {
    var wanted = new URLSearchParams(location.search).get("product");
    var selp = $("#f-product");
    if (wanted && selp) {
      Array.prototype.forEach.call(selp.options, function (o) { if (o.value === wanted || o.text === wanted) selp.value = o.value; });
    }
  } catch (e) {}

  /* ---------- Copy buttons ---------- */
  $$("[data-copy]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var txt = btn.dataset.copy;
      var done = function () { var o = btn.textContent; btn.textContent = "Copied"; setTimeout(function () { btn.textContent = o; }, 1500); };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(txt).then(done, function () { selectText(btn.previousElementSibling); });
      } else { selectText(btn.previousElementSibling); }
    });
  });
  function selectText(el) {
    var r = document.createRange(); r.selectNodeContents(el);
    var s = window.getSelection(); s.removeAllRanges(); s.addRange(r);
  }

  /* ---------- Contact form validation ---------- */
  var form = $("#quoteForm");
  var check = function () { return true; };
  if (form) (function () {
  var rules = {
    name: function (v) { return v.trim().length >= 2 || T("e_name"); },
    email: function (v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) || T("e_email"); },
    phone: function (v) { return v.trim() === "" || /^[+\d][\d\s()-]{6,}$/.test(v.trim()) || T("e_phone"); },
    product: function (v) { return v !== "" || T("e_product"); },
    message: function (v) { return v.trim().length >= 10 || T("e_message"); }
  };
  check = function (field) {
    var rule = rules[field.name]; if (!rule) return true;
    var res = rule(field.value), wrap = field.closest(".field"), msg = $(".msg", wrap);
    var ok = res === true;
    wrap.classList.toggle("err", !ok);
    msg.textContent = ok ? "" : res;
    field.setAttribute("aria-invalid", ok ? "false" : "true");
    return ok;
  };
  $$("input, select, textarea", form).forEach(function (f) {
    f.addEventListener("blur", function () { check(f); });
    f.addEventListener("input", function () { if (f.closest(".field").classList.contains("err")) check(f); });
  });
  var toast = $("#toast"), toastText = $("#toastText"), toastTimer;
  function showToast(html) {
    toastText.innerHTML = html;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.classList.remove("show"); }, 9000);
  }
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var fields = $$("input, select, textarea", form);
    var allOk = fields.map(check).every(Boolean);
    if (!allOk) { var bad = $(".field.err input, .field.err select, .field.err textarea", form); if (bad) bad.focus(); return; }
    var d = {}; fields.forEach(function (f) { d[f.name] = f.value.trim(); });
    var text = "Quote request – Africontinent Global%0A" +
      encodeURIComponent("Name: " + d.name + (d.company ? " (" + d.company + ")" : "") + "\nEmail: " + d.email +
      (d.phone ? "\nPhone: " + d.phone : "") + "\nCategory: " + d.product + "\n\n" + d.message);
    var url = "https://wa.me/27716682694?text=" + text;
    showToast(T("toast").replace("{name}", escapeHtml(d.name.split(" ")[0])) +
      ' <a href="' + url + '" target="_blank" rel="noopener" style="color:var(--gold-hi);font-weight:600">' + T("toast_link") + "</a>");
  });
  })();
  function escapeHtml(s) { return s.replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }

  /* ---------- EN / PT language toggle ---------- */
  var dict = {
    pt: {
      enter: "Entrar no site", nav_home: "Início", nav_about: "Sobre Nós", nav_services: "Serviços", nav_products: "Produtos", nav_how: "Como Funciona", nav_contact: "Contacto",
      quote: "Pedir Cotação", hero_eyebrow: "Aquisições e Comércio Internacional",
      hero_title: "Ligamos África aos mercados globais através de um <em>comércio de confiança.</em>",
      hero_lede: "A Africontinent Global ajuda empresas e particulares a encontrar produtos de qualidade, negociar com fornecedores fiáveis e coordenar a compra e entrega além-fronteiras.",
      btn_services: "Os Nossos Serviços", btn_contact: "Contacte-nos",
      t1: "Parcerias de Confiança", t1d: "Fornecedores fiáveis com quem pode contar.", t2: "Transações Seguras", t2d: "Seguras, transparentes e conformes.", t3: "Entrega Pontual", t3d: "Logística eficiente além-fronteiras.",
      svc_eyebrow: "Os Nossos Serviços", svc_title: "O Que Fazemos", svc_lede: "Um único parceiro desde o primeiro pedido até à entrega. Tratamos de cada etapa para que lide com uma só equipa, uma cotação e um contacto.",
      s1: "Procura de Produtos", s1d: "Encontramos os produtos certos junto de fabricantes e distribuidores verificados, de acordo com a sua especificação e orçamento.",
      s2: "Negociação com Fornecedores", s2d: "Negociamos preço, condições de pagamento, prazos e garantias em seu nome.",
      s3: "Aquisições", s3d: "Gerimos encomendas, faturas e pagamentos e mantemo-lo informado em cada etapa.",
      s4: "Controlo de Qualidade", s4d: "Os produtos são inspecionados, contados e fotografados antes do envio.",
      s5: "Logística e Transporte", s5d: "Reservamos transporte rodoviário, marítimo e aéreo e acompanhamos a sua carga.",
      s6: "Alfândega e Entrega", s6d: "Preparamos a documentação, tratamos do desembaraço e entregamos no seu armazém ou obra.",
      how_eyebrow: "Como Funciona", how_title: "Simples. Transparente. Eficiente.",
      h1: "Contacta-nos", h1d: "Diga-nos o que precisa, a quantidade e o destino.", h2: "Procuramos", h2d: "Encontramos fornecedores adequados e comparamos opções.", h3: "Negociamos", h3d: "Garantimos o melhor preço e condições.", h4: "Aprova", h4d: "Confirma a cotação, a encomenda e o pagamento.", h5: "Entregamos", h5d: "Coordenamos transporte, documentos e alfândega.", h6: "Recebe", h6d: "Os seus produtos chegam em segurança e a tempo.",
      prod_eyebrow: "Categorias Populares", prod_title: "O Que Fornecemos", prod_lede: "De uma palete a contentores completos, estas são as categorias mais pedidas.",
      p1: "Materiais de Construção", p2: "Ferragens e Ferramentas", p3: "Material Elétrico", p4: "Equipamento Industrial", p5: "Agricultura", p6: "Fornecimentos Gerais", view: "Ver produtos", more_products: "Pergunte por Outro Produto",
      st1: "Clientes servidos", st2: "Fornecedores na rede", st3: "Países alcançados", st4: "Envios entregues",
      about_eyebrow: "Sobre Nós", about_title: "O Seu Parceiro Comercial de Confiança", about_p: "A Africontinent Global é uma agência internacional de aquisições e comércio. Compramos em nome de clientes em África e no mundo, garantindo qualidade, valor e fiabilidade da cotação à entrega final.",
      why: "Porquê escolher-nos?", w1: "Presença Local", w1d: "Equipas na África do Sul e em Moçambique.", w2: "Foco no Cliente", w2d: "Compreendemos as suas necessidades.", w3: "Experiência", w3d: "Comércio transfronteiriço, alfândega e regulamentos.", w4: "Integridade", w4d: "Serviço honesto, transparente e profissional.",
      test_eyebrow: "Testemunhos", test_title: "Confiança Além-Fronteiras",
      ct_eyebrow: "Contacte-nos", ct_title: "Vamos Trabalhar Juntos", ct_lede: "Diga-nos o que precisa e para onde. Respondemos com opções e uma cotação, normalmente num dia útil.",
      ct_phone: "Telefone / WhatsApp", ct_email: "Email", ct_sa: "Escritório na África do Sul", ct_mz: "Escritório em Moçambique",
      f_name: "O Seu Nome", f_company: "Empresa", f_email: "Email", f_phone: "Telefone / WhatsApp", f_product: "Produto / Serviço", f_message: "Mensagem", send: "Enviar Mensagem", form_note: "Usamos os seus dados apenas para responder a este pedido.",
      ft_about: "Aquisições e comércio internacional. Ligamos mercados, encontramos soluções e entregamos valor.", ft_links: "Links Rápidos", ft_offices: "Escritórios", ft_follow: "Siga-nos",
      all_services: "Todos os Serviços", learn_how: "Ver Como Funciona", ask_q: "Pedir cotação", cl_t: "Tudo o que o Seu Projeto Precisa",
      cta_t: "Tem um produto em mente? <em>Nós encontramos.</em>", cta_l: "Envie-nos o artigo, a quantidade e a cidade de entrega. Respondemos com opções de fornecedores e uma cotação completa.",
      pa_e: "Sobre Nós", pa_t: "O seu parceiro de confiança no <em>comércio africano.</em>", pa_l: "Compramos, verificamos, enviamos e desalfandegamos produtos em nome dos nossos clientes.",
      ps_e: "Os Nossos Serviços", ps_t: "Do primeiro pedido à <em>entrega final.</em>", ps_l: "Seis serviços, uma equipa. Use-nos para todo o processo ou apenas para a parte de que precisa.",
      pp_e: "Produtos", pp_t: "Produtos de qualidade, <em>escolhidos para si.</em>", pp_l: "Diga-nos a especificação e nós encontramos o fornecedor, verificamos e entregamos.",
      ph_e: "Como Funciona", ph_t: "Simples, transparente, <em>passo a passo.</em>", ph_l: "Sabe sempre o que acontece a seguir, quanto custa e quando chega.",
      pc_e: "Contacto", pc_t: "Vamos falar sobre a <em>sua próxima encomenda.</em>", pc_l: "Envie o seu pedido e respondemos com opções e uma cotação, normalmente num dia útil.",
      mv1k: "A nossa missão", mv1t: "Simplificar compras além-fronteiras", mv1p: "Dar às empresas africanas acesso fiável a produtos de qualidade, a preços justos e sem o risco de comprar sozinhas além-fronteiras.",
      mv2k: "A nossa visão", mv2t: "Um mercado africano ligado", mv2p: "Ser o parceiro que liga fornecedores e compradores em todo o continente, um envio de confiança de cada vez.",
      mv3k: "Os nossos valores", mv3t: "Como trabalhamos", v1: "Transparência em cada preço", v2: "Responsabilidade da cotação à entrega", v3: "Respeito pelo seu orçamento e prazos", v4: "Relações duradouras com fornecedores",
      off_e: "Onde Estamos", off_t: "Dois Escritórios, Um Corredor", off_l: "As nossas equipas dos dois lados da fronteira mantêm a sua encomenda em movimento.",
      hd_e: "O Que Tratamos", hd_t: "Cada documento, cada etapa", hd_l: "Comprar além-fronteiras envolve papelada e muitas partes. Nós tratamos de tudo.",
      faq_e: "Perguntas", faq_t: "Perguntas Frequentes",
      intro_tag: "Ligamos Mercados<i>|</i>Encontramos Soluções<i>|</i>Entregamos Valor", skip: "Saltar ›",
      mz_phone: "Número de telefone em breve",
      p7: "Peças de Competição", p7d: "Fornecemos peças de competição e desempenho para pista, arrancadas e rua, compradas localmente ou importadas de marcas de confiança.",
      p8: "Ajuda na Compra de Viaturas", p8d: "Ajudamos a comprar qualquer carro que deseje. Diga-nos a marca, o modelo, o ano e o orçamento, e nós encontramos, verificamos, negociamos o preço e tratamos da entrega.",
      p9: "Encomendamos na Temu", p9d: "Encontrou algo na Temu? Envie-nos o link. Fazemos a encomenda por si, recebemos e verificamos as encomendas e entregamos à sua porta, também além-fronteiras.",
      prod_lede_home: "De uma palete a contentores completos, estas são as categorias mais pedidas. Também fornecemos peças de competição, ajudamos a comprar qualquer carro e encomendamos na Temu por si.",
      e_name: "Introduza o seu nome.", e_email: "Introduza um email válido, por ex. nome@empresa.com.", e_phone: "Use apenas números, espaços e +.", e_product: "Escolha uma categoria.", e_message: "Descreva o pedido em pelo menos 10 caracteres.",
      toast: "Obrigado, {name}. O seu pedido está pronto.", toast_link: "Enviar por WhatsApp →"
    },
    en: {
      e_name: "Please enter your name.", e_email: "Enter a valid email, e.g. name@company.com.", e_phone: "Use numbers, spaces and + only.", e_product: "Choose a product category.", e_message: "Describe your request in at least 10 characters.",
      toast: "Thanks, {name}. Your enquiry is ready.", toast_link: "Send it on WhatsApp →"
    }
  };
  var lang = "en";
  $$("[data-i18n],[data-i18n-html]").forEach(function (el) {
    if (el.hasAttribute("data-i18n")) el.dataset.en = el.textContent; else el.dataset.en = el.innerHTML;
  });
  function T(k) { return (dict[lang] && dict[lang][k]) || dict.en[k] || k; }
  function setLang(l) {
    lang = l;
    doc.lang = l === "pt" ? "pt" : "en";
    $$("[data-i18n]").forEach(function (el) { var k = el.dataset.i18n; el.textContent = l === "en" ? el.dataset.en : (dict.pt[k] || el.dataset.en); });
    $$("[data-i18n-html]").forEach(function (el) { var k = el.dataset.i18nHtml; el.innerHTML = l === "en" ? el.dataset.en : (dict.pt[k] || el.dataset.en); });
    $$(".lang button").forEach(function (b) { b.classList.toggle("on", b.dataset.lang === l); });
    if (form) $$(".field.err", form).forEach(function (w) { check($("input,select,textarea", w)); });
    try { localStorage.setItem("acg_lang", l); } catch (e) {}
  }
  $$(".lang button").forEach(function (b) { b.addEventListener("click", function () { setLang(b.dataset.lang); }); });
  try { var saved = localStorage.getItem("acg_lang"); if (saved === "pt") setLang("pt"); } catch (e) {}
})();
