import{s as l,b as k,r as n,a as S,e as q,c as g,d as x,f as L,g as A,h as I,i as T,j as _,k as m,p as D,l as C,m as Q,n as j,D as H,t as w,o as M,q as N,u as E}from"./index-B6A4_iyn.js";const s=document.querySelector("#app");if(!s)throw new Error("Missing app root");function R(){const a=n.modal;if(!a)return"";if(a.kind==="question"){const e=l.categories.find(i=>i.id===a.categoryId),d=e==null?void 0:e.questions.find(i=>i.id===a.questionId);if(!e||!d)return"";const o=a.revealed,r=Math.max(0,a.remaining),c=r>0&&r<=5,u=`<span class="badge" style="background:${e.color}">${e.name}</span>`,v=d.options.length?`<div class="option-grid">${d.options.map(i=>`<div class="option-chip ${o&&i===d.answer?"option-chip--correct":""}">${i}</div>`).join("")}</div>`:"",t=o?`<div class="answer-box"><div class="answer-box__title">Đáp án</div><pre>${d.answer}</pre></div>`:"";return`
      <div class="modal-backdrop">
        <section class="modal-card modal-card--question">
          <div class="modal-header">
            ${u}
            <div class="timer ${c?"timer--danger":""}">${r}s</div>
          </div>
          <h2 class="modal-title">${d.question}</h2>
          ${v}
          ${t}
          <div class="modal-actions">
            <button class="btn btn-ghost" data-action="toggle-pause">${a.paused?"Tiếp tục":"Tạm dừng"}</button>
            <button class="btn btn-primary" data-action="reveal-answer">${o?"Đóng":"Hiện đáp án"}</button>
          </div>
        </section>
      </div>
    `}return a.kind==="gift"?`
      <div class="modal-backdrop">
        <section class="modal-card modal-card--simple">
          <div class="modal-eyebrow">${a.title}</div>
          <div class="modal-gift">${a.text}</div>
          <div class="modal-actions modal-actions--center">
            <button class="btn btn-primary" data-action="close-modal">Đóng</button>
          </div>
        </section>
      </div>
    `:`
    <div class="modal-backdrop">
      <section class="modal-card modal-card--simple">
        <div class="modal-notice">${a.text}</div>
        <div class="modal-actions modal-actions--center">
          <button class="btn btn-primary" data-action="close-modal">Đóng</button>
        </div>
      </section>
    </div>
  `}function U(a){const d=360/Math.max(a.length,1),o=a.map((c,u)=>{const v=d*u,t=d*(u+1);return`${c.color} ${v}deg ${t}deg`}).join(", "),r=a.map((c,u)=>`
        <div class="wheel-label" style="--angle:${d*u+d/2}deg; --radius:38%">
          <span>${c.label}</span>
        </div>
      `).join("");return`
    <div class="wheel-shell">
      <div class="wheel-pointer"></div>
      <div class="wheel" style="--spin-duration:${H.spinDurationMs}ms; transform: rotate(${n.rotation}deg); background: conic-gradient(${o});">
        ${r}
        <div class="wheel-center"></div>
      </div>
    </div>
  `}function X(){const a=k(l.categories),e=l.categories[0],d=n.spinning?"Đang quay":n.modal?"Đang hiển thị câu hỏi":"Sẵn sàng",o=l.settings.gifts.length>0&&l.settings.punishments.length>0,r=l.categories.map(c=>`<li><span style="background:${c.color}"></span>${c.name} - ${c.questions.length} câu</li>`).join("");return`
    <section class="panel panel--hero">
      ${o?"":'<div class="warning-banner">Hãy thêm ít nhất 1 Quà tặng và 1 Hình phạt trong Cài đặt trước khi quay.</div>'}
      <div class="spin-grid">
        <div>
          ${U(a)}
          <button class="btn btn-spin" data-action="spin" ${n.spinning||n.modal||!o?"disabled":""}>QUAY NGAY</button>
        </div>
        <div class="stacked-card">
          <div class="stacked-card__title">Trạng thái</div>
          <div class="status-pill">${d}</div>
          <div class="stacked-card__title">Lịch sử lĩnh vực</div>
          <ul class="history-list">${r||"<li>Chưa có dữ liệu</li>"}</ul>
          <div class="stacked-card__title">Lượt hiện tại</div>
          <div class="current-player">${(e==null?void 0:e.name)??"Chưa có lĩnh vực"}</div>
        </div>
      </div>
    </section>
  `}function B(a,e){const d=n.editingQuestionId===e.id,o=e.options.length?`${e.options.length} lựa chọn`:"Tự luận";return d?`
      <div class="question-row question-row--editing">
        <input class="input" data-field="edit-question" data-id="${e.id}" value="${$(e.question)}" />
        <input class="input" data-field="edit-answer" data-id="${e.id}" value="${$(e.answer)}" />
        <textarea class="textarea textarea--small" data-field="edit-options" data-id="${e.id}">${p(e.options.join(`
`))}</textarea>
        <div class="row-actions">
          <button class="btn btn-primary" data-action="save-question-edit" data-id="${e.id}">Lưu</button>
          <button class="btn btn-ghost" data-action="cancel-question-edit">Hủy</button>
        </div>
      </div>
    `:`
    <div class="question-row">
      <div>
        <div class="question-row__title">${e.question}</div>
        <div class="question-row__meta">${o}</div>
      </div>
      <div class="row-actions">
        <button class="btn btn-ghost" data-action="start-edit-question" data-id="${e.id}">Sửa</button>
        <button class="btn btn-danger" data-action="delete-question" data-id="${e.id}">Xóa</button>
      </div>
    </div>
  `}function P(){const a=g(),e=l.categories.map(c=>`
        <button class="category-pill ${c.id===(a==null?void 0:a.id)?"category-pill--active":""}" data-action="select-category" data-id="${c.id}">
          <span class="category-dot" style="background:${c.color}"></span>${c.name}
        </button>
      `).join(""),d=(a==null?void 0:a.questions.map(c=>B(a,c)).join(""))??"",o=n.importReport,r=o?`
      <div class="import-report">
        <div class="card-title">Kết quả nhập Excel</div>
        <div class="import-report__summary">Imported: ${o.imported} questions · Skipped: ${o.skipped} rows</div>
        ${o.diagnostics.length?`<ul class="import-report__list">${o.diagnostics.map(c=>`
                  <li>
                    <strong>Row ${c.rowNumber}:</strong> ${c.reason}
                    <span>${p(c.rawData.join(" | ")||"—")}</span>
                  </li>
                `).join("")}</ul>`:'<div class="muted">Không có dòng bị bỏ qua.</div>'}
      </div>
    `:"";return`
    <section class="panel">
      <div class="section-head">
        <div>
          <div class="eyebrow">Ngân hàng câu hỏi</div>
          <h2>${(a==null?void 0:a.name)??"Chưa có lĩnh vực"}</h2>
          <p>${a?`${a.questions.length} câu trong kho`:"Tạo một lĩnh vực để bắt đầu."}</p>
        </div>
        <div class="section-head__actions">
          <button class="btn btn-ghost" data-action="rename-category" ${a?"":"disabled"}>Đổi tên</button>
          <button class="btn btn-danger" data-action="delete-category" ${a?"":"disabled"}>Xóa sạch mục này</button>
        </div>
      </div>

      <div class="category-strip">
        ${e}
        <button class="category-pill category-pill--add" data-action="add-category">+ Thêm lĩnh vực mới</button>
      </div>

      <div class="bank-grid">
        <div class="card">
          <div class="card-title">Nhập tay</div>
          <textarea class="textarea" id="question-input" placeholder="Câu hỏi">${p(n.questionDraft.question)}</textarea>
          <textarea class="textarea textarea--small" id="options-input" placeholder="4 lựa chọn, mỗi dòng 1 đáp án">${p(n.questionDraft.options)}</textarea>
          <input class="input" id="answer-input" placeholder="Đáp án" value="${$(n.questionDraft.answer)}" />
          <div class="row-actions">
            <button class="btn btn-primary" data-action="save-question">+ Thêm câu</button>
          </div>
        </div>

        <div class="card">
          <div class="card-title">Upload Excel</div>
          <input id="excel-input" class="file-input" type="file" accept=".xlsx,.xls" />
          <p class="muted">Hỗ trợ 2 hoặc 3 cột, ưu tiên format hybrid A/B/C như bản thiết kế.</p>
        </div>
      </div>

      ${r}

      <div class="question-list">${d||'<div class="empty-state">Chưa có câu hỏi nào trong lĩnh vực này.</div>'}</div>
    </section>
  `}function z(){return`
    <section class="panel">
      <div class="section-head">
        <div>
          <div class="eyebrow">Cài đặt</div>
          <h2>Điều khiển app</h2>
          <p>Chỉnh thời gian, âm thanh và các danh sách quay ngẫu nhiên.</p>
        </div>
      </div>

      <div class="settings-grid">
        <div class="card">
          <div class="card-title">Thời gian đếm ngược</div>
          <div class="slider-row">
            <input id="timer-slider" type="range" min="10" max="60" value="${l.settings.timer}" />
            <span class="slider-value">${l.settings.timer}s</span>
          </div>
        </div>

        <div class="card">
          <div class="card-title">Âm thanh</div>
          <label class="toggle-row">
            <span>Bật/tắt toàn bộ âm thanh</span>
            <input id="sound-toggle" type="checkbox" ${l.settings.sound?"checked":""} />
          </label>
        </div>

        <div class="card">
          <div class="card-title">Danh sách Quà tặng</div>
          <textarea class="textarea" id="gifts-input" placeholder="Được cộng thêm 10đ
Nghỉ 1 lượt miễn phí">${p(E(l.settings.gifts))}</textarea>
        </div>

        <div class="card">
          <div class="card-title">Danh sách Hình phạt</div>
          <textarea class="textarea" id="punishments-input" placeholder="Chống đẩy 10 cái
Hát 1 bài">${p(E(l.settings.punishments))}</textarea>
        </div>
      </div>

      <div class="danger-zone">
        <button class="btn btn-danger btn-danger--wide" data-action="clear-all">Xóa sạch toàn bộ kho câu hỏi</button>
      </div>
    </section>
  `}function G(){const a=(e,d)=>`<button class="nav-tab ${n.tab===e?"nav-tab--active":""}" data-action="switch-tab" data-tab="${e}">${d}</button>`;return`
    <nav class="nav-shell">
      ${a("spin","Vòng quay")}
      ${a("bank","Ngân hàng")}
      ${a("settings","Cài đặt")}
    </nav>
  `}function b(){const a=n.tab==="spin"?X():n.tab==="bank"?P():z();s.innerHTML=`
    <div class="app-shell">
      <header class="app-header">
        <div>
          <div class="eyebrow">QuizSpin</div>
          <h1>Vòng quay kiến thức offline</h1>
        </div>
        <div class="header-pills">
          <span class="mini-pill">${l.categories.length} lĩnh vực</span>
          <span class="mini-pill">${l.categories.reduce((e,d)=>e+d.questions.length,0)} câu</span>
        </div>
      </header>

      ${G()}

      <main class="content-area">
        ${a}
      </main>

      ${n.toast?`<div class="toast">${n.toast}</div>`:""}
      ${R()}
    </div>
  `,K()}function K(){s.querySelectorAll('[data-action="switch-tab"]').forEach(t=>{t.addEventListener("click",()=>{n.tab=t.dataset.tab,b()})}),s.querySelectorAll('[data-action="select-category"]').forEach(t=>{t.addEventListener("click",()=>{const i=t.dataset.id;i&&S(i)})}),s.querySelectorAll('[data-action="start-edit-question"]').forEach(t=>{t.addEventListener("click",()=>{n.editingQuestionId=t.dataset.id??null,q(g()),b()})}),s.querySelectorAll('[data-action="save-question-edit"]').forEach(t=>{t.addEventListener("click",()=>{const i=t.dataset.id,h=s.querySelector(`[data-field="edit-question"][data-id="${i}"]`),f=s.querySelector(`[data-field="edit-answer"][data-id="${i}"]`),y=s.querySelector(`[data-field="edit-options"][data-id="${i}"]`);!i||!h||!f||!y||x(i,h.value,y.value,f.value)})}),s.querySelectorAll('[data-action="cancel-question-edit"]').forEach(t=>{t.addEventListener("click",()=>{n.editingQuestionId=null,q(g()),b()})}),s.querySelectorAll('[data-action="delete-question"]').forEach(t=>{t.addEventListener("click",()=>{const i=t.dataset.id,h=g();!i||!h||window.confirm("Xóa câu hỏi này?")&&L(h.id,i)})}),s.querySelectorAll('[data-action="rename-category"]').forEach(t=>{t.addEventListener("click",()=>{const i=g();i&&A(i)})}),s.querySelectorAll('[data-action="delete-category"]').forEach(t=>{t.addEventListener("click",()=>{const i=g();i&&I(i)})}),s.querySelectorAll('[data-action="add-category"]').forEach(t=>{t.addEventListener("click",()=>T())}),s.querySelectorAll('[data-action="save-question"]').forEach(t=>{t.addEventListener("click",()=>_())});const a=s.querySelector("#question-input"),e=s.querySelector("#options-input"),d=s.querySelector("#answer-input");a&&a.addEventListener("input",()=>{n.questionDraft.question=a.value}),e&&e.addEventListener("input",()=>{n.questionDraft.options=e.value}),d&&d.addEventListener("input",()=>{n.questionDraft.answer=d.value});const o=s.querySelector("#timer-slider");o&&o.addEventListener("input",()=>{m(t=>({...t,settings:{...t.settings,timer:Number(o.value)}}))});const r=s.querySelector("#sound-toggle");r&&r.addEventListener("change",()=>{m(t=>({...t,settings:{...t.settings,sound:r.checked}}))});const c=s.querySelector("#gifts-input");c&&c.addEventListener("input",()=>{m(t=>({...t,settings:{...t.settings,gifts:w(c.value,t.settings.gifts,i=>({id:crypto.randomUUID(),text:i}))}})),n.usedGifts.clear()});const u=s.querySelector("#punishments-input");u&&u.addEventListener("input",()=>{m(t=>({...t,settings:{...t.settings,punishments:w(u.value,t.settings.punishments,i=>({id:crypto.randomUUID(),text:i}))}})),n.usedPunishments.clear()});const v=s.querySelector("#excel-input");v&&v.addEventListener("change",()=>{var i;const t=(i=v.files)==null?void 0:i[0];t&&D(t),v.value=""}),s.querySelectorAll('[data-action="spin"]').forEach(t=>{t.addEventListener("click",()=>C())}),s.querySelectorAll('[data-action="toggle-pause"]').forEach(t=>{t.addEventListener("click",()=>{!n.modal||n.modal.kind!=="question"||M()})}),s.querySelectorAll('[data-action="reveal-answer"]').forEach(t=>{t.addEventListener("click",()=>{N()})}),s.querySelectorAll('[data-action="close-modal"]').forEach(t=>{t.addEventListener("click",()=>Q())}),s.querySelectorAll('[data-action="clear-all"]').forEach(t=>{t.addEventListener("click",()=>j())})}function p(a){return a.replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;")}function $(a){return p(a).replaceAll("'","&#39;")}export{b as render};
