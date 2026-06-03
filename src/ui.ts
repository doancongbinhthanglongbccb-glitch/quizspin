import type { ActiveModal, Category, Question, WheelSegment } from './types';
import { buildWheelSegments, rewardItemsToText, textToRewardItems } from './data';
import { DEFAULTS } from './config';
import * as Core from './core';

const appRoot = document.querySelector<HTMLDivElement>('#app');

if (!appRoot) {
  throw new Error('Missing app root');
}

function renderModal(): string {
  const modal = Core.runtime.modal;
  if (!modal) {
    return '';
  }

  if (modal.kind === 'question') {
    const category = Core.state.categories.find((item) => item.id === modal.categoryId);
    const question = category?.questions.find((item) => item.id === modal.questionId);
    if (!category || !question) {
      return '';
    }
    const revealed = modal.revealed;
    const remaining = Math.max(0, modal.remaining);
    const danger = remaining > 0 && remaining <= 5;
    const badge = `<span class="badge" style="background:${category.color}">${category.name}</span>`;
    const options = question.options.length
      ? `<div class="option-grid">${question.options
          .map(
            (option) => `<div class="option-chip ${revealed && option === question.answer ? 'option-chip--correct' : ''}">${option}</div>`,
          )
          .join('')}</div>`
      : '';
    const answerBox = revealed
      ? `<div class="answer-box"><div class="answer-box__title">Đáp án</div><pre>${question.answer}</pre></div>`
      : '';

    return `
      <div class="modal-backdrop">
        <section class="modal-card modal-card--question">
          <div class="modal-header">
            ${badge}
            <div class="timer ${danger ? 'timer--danger' : ''}">${remaining}s</div>
          </div>
          <h2 class="modal-title">${question.question}</h2>
          ${options}
          ${answerBox}
          <div class="modal-actions">
            <button class="btn btn-ghost" data-action="toggle-pause">${modal.paused ? 'Tiếp tục' : 'Tạm dừng'}</button>
            <button class="btn btn-primary" data-action="reveal-answer">${revealed ? 'Đóng' : 'Hiện đáp án'}</button>
          </div>
        </section>
      </div>
    `;
  }

  if (modal.kind === 'gift') {
    return `
      <div class="modal-backdrop">
        <section class="modal-card modal-card--simple">
          <div class="modal-eyebrow">${modal.title}</div>
          <div class="modal-gift">${modal.text}</div>
          <div class="modal-actions modal-actions--center">
            <button class="btn btn-primary" data-action="close-modal">Đóng</button>
          </div>
        </section>
      </div>
    `;
  }

  return `
    <div class="modal-backdrop">
      <section class="modal-card modal-card--simple">
        <div class="modal-notice">${modal.text}</div>
        <div class="modal-actions modal-actions--center">
          <button class="btn btn-primary" data-action="close-modal">Đóng</button>
        </div>
      </section>
    </div>
  `;
}

function renderWheel(segments: WheelSegment[]): string {
  const count = Math.max(segments.length, 1);
  const slice = 360 / count;
  const parts = segments
    .map((segment, index) => {
      const from = slice * index;
      const to = slice * (index + 1);
      return `${segment.color} ${from}deg ${to}deg`;
    })
    .join(', ');

  const labels = segments
    .map((segment, index) => {
      const angle = slice * index + slice / 2;
      const radius = 38;
      return `
        <div class="wheel-label" style="--angle:${angle}deg; --radius:${radius}%">
          <span>${segment.label}</span>
        </div>
      `;
    })
    .join('');

  return `
    <div class="wheel-shell">
      <div class="wheel-pointer"></div>
      <div class="wheel" style="--spin-duration:${DEFAULTS.spinDurationMs}ms; transform: rotate(${Core.runtime.rotation}deg); background: conic-gradient(${parts});">
        ${labels}
        <div class="wheel-center"></div>
      </div>
    </div>
  `;
}

function renderSpinTab(): string {
  const segments = buildWheelSegments(Core.state.categories);
  const activeCategory = Core.state.categories[0];
  const status = Core.runtime.spinning ? 'Đang quay' : Core.runtime.modal ? 'Đang hiển thị câu hỏi' : 'Sẵn sàng';
  const rewardReady = Core.state.settings.gifts.length > 0 && Core.state.settings.punishments.length > 0;
  const recent = Core.state.categories
    .map((category) => `<li><span style="background:${category.color}"></span>${category.name} - ${category.questions.length} câu</li>`)
    .join('');

  return `
    <section class="panel panel--hero">
      ${rewardReady ? '' : '<div class="warning-banner">Hãy thêm ít nhất 1 Quà tặng và 1 Hình phạt trong Cài đặt trước khi quay.</div>'}
      <div class="spin-grid">
        <div>
          ${renderWheel(segments)}
          <button class="btn btn-spin" data-action="spin" ${Core.runtime.spinning || Core.runtime.modal || !rewardReady ? 'disabled' : ''}>QUAY NGAY</button>
        </div>
        <div class="stacked-card">
          <div class="stacked-card__title">Trạng thái</div>
          <div class="status-pill">${status}</div>
          <div class="stacked-card__title">Lịch sử lĩnh vực</div>
          <ul class="history-list">${recent || '<li>Chưa có dữ liệu</li>'}</ul>
          <div class="stacked-card__title">Lượt hiện tại</div>
          <div class="current-player">${activeCategory?.name ?? 'Chưa có lĩnh vực'}</div>
        </div>
      </div>
    </section>
  `;
}

function renderQuestionRow(category: Category, question: Question): string {
  const isEditing = Core.runtime.editingQuestionId === question.id;
  const optionLabel = question.options.length ? `${question.options.length} lựa chọn` : 'Tự luận';
  if (isEditing) {
    return `
      <div class="question-row question-row--editing">
        <input class="input" data-field="edit-question" data-id="${question.id}" value="${escapeAttr(question.question)}" />
        <input class="input" data-field="edit-answer" data-id="${question.id}" value="${escapeAttr(question.answer)}" />
        <textarea class="textarea textarea--small" data-field="edit-options" data-id="${question.id}">${escapeHtml(question.options.join('\n'))}</textarea>
        <div class="row-actions">
          <button class="btn btn-primary" data-action="save-question-edit" data-id="${question.id}">Lưu</button>
          <button class="btn btn-ghost" data-action="cancel-question-edit">Hủy</button>
        </div>
      </div>
    `;
  }

  return `
    <div class="question-row">
      <div>
        <div class="question-row__title">${question.question}</div>
        <div class="question-row__meta">${optionLabel}</div>
      </div>
      <div class="row-actions">
        <button class="btn btn-ghost" data-action="start-edit-question" data-id="${question.id}">Sửa</button>
        <button class="btn btn-danger" data-action="delete-question" data-id="${question.id}">Xóa</button>
      </div>
    </div>
  `;
}

function renderQuestionTab(): string {
  const category = Core.currentCategory();
  const categoryPills = Core.state.categories
    .map(
      (item) => `
        <button class="category-pill ${item.id === category?.id ? 'category-pill--active' : ''}" data-action="select-category" data-id="${item.id}">
          <span class="category-dot" style="background:${item.color}"></span>${item.name}
        </button>
      `,
    )
    .join('');

  const questions = category?.questions.map((question) => renderQuestionRow(category, question)).join('') ?? '';
  const importReport = Core.runtime.importReport;

  const importSummary = importReport
    ? `
      <div class="import-report">
        <div class="card-title">Kết quả nhập Excel</div>
        <div class="import-report__summary">Imported: ${importReport.imported} questions · Skipped: ${importReport.skipped} rows</div>
        ${importReport.diagnostics.length
          ? `<ul class="import-report__list">${importReport.diagnostics
              .map(
                (item) => `
                  <li>
                    <strong>Row ${item.rowNumber}:</strong> ${item.reason}
                    <span>${escapeHtml(item.rawData.join(' | ') || '—')}</span>
                  </li>
                `,
              )
              .join('')}</ul>`
          : '<div class="muted">Không có dòng bị bỏ qua.</div>'}
      </div>
    `
    : '';

  return `
    <section class="panel">
      <div class="section-head">
        <div>
          <div class="eyebrow">Ngân hàng câu hỏi</div>
          <h2>${category?.name ?? 'Chưa có lĩnh vực'}</h2>
          <p>${category ? `${category.questions.length} câu trong kho` : 'Tạo một lĩnh vực để bắt đầu.'}</p>
        </div>
        <div class="section-head__actions">
          <button class="btn btn-ghost" data-action="rename-category" ${category ? '' : 'disabled'}>Đổi tên</button>
          <button class="btn btn-danger" data-action="delete-category" ${category ? '' : 'disabled'}>Xóa sạch mục này</button>
        </div>
      </div>

      <div class="category-strip">
        ${categoryPills}
        <button class="category-pill category-pill--add" data-action="add-category">+ Thêm lĩnh vực mới</button>
      </div>

      <div class="bank-grid">
        <div class="card">
          <div class="card-title">Nhập tay</div>
          <textarea class="textarea" id="question-input" placeholder="Câu hỏi">${escapeHtml(Core.runtime.questionDraft.question)}</textarea>
          <textarea class="textarea textarea--small" id="options-input" placeholder="4 lựa chọn, mỗi dòng 1 đáp án">${escapeHtml(Core.runtime.questionDraft.options)}</textarea>
          <input class="input" id="answer-input" placeholder="Đáp án" value="${escapeAttr(Core.runtime.questionDraft.answer)}" />
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

      ${importSummary}

      <div class="question-list">${questions || '<div class="empty-state">Chưa có câu hỏi nào trong lĩnh vực này.</div>'}</div>
    </section>
  `;
}

function renderSettingsTab(): string {
  return `
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
            <input id="timer-slider" type="range" min="10" max="60" value="${Core.state.settings.timer}" />
            <span class="slider-value">${Core.state.settings.timer}s</span>
          </div>
        </div>

        <div class="card">
          <div class="card-title">Âm thanh</div>
          <label class="toggle-row">
            <span>Bật/tắt toàn bộ âm thanh</span>
            <input id="sound-toggle" type="checkbox" ${Core.state.settings.sound ? 'checked' : ''} />
          </label>
        </div>

        <div class="card">
          <div class="card-title">Danh sách Quà tặng</div>
          <textarea class="textarea" id="gifts-input" placeholder="Được cộng thêm 10đ\nNghỉ 1 lượt miễn phí">${escapeHtml(rewardItemsToText(Core.state.settings.gifts))}</textarea>
        </div>

        <div class="card">
          <div class="card-title">Danh sách Hình phạt</div>
          <textarea class="textarea" id="punishments-input" placeholder="Chống đẩy 10 cái\nHát 1 bài">${escapeHtml(rewardItemsToText(Core.state.settings.punishments))}</textarea>
        </div>
      </div>

      <div class="danger-zone">
        <button class="btn btn-danger btn-danger--wide" data-action="clear-all">Xóa sạch toàn bộ kho câu hỏi</button>
      </div>
    </section>
  `;
}

function renderTabs(): string {
  const button = (key: 'spin' | 'bank' | 'settings', label: string) =>
    `<button class="nav-tab ${Core.runtime.tab === key ? 'nav-tab--active' : ''}" data-action="switch-tab" data-tab="${key}">${label}</button>`;

  return `
    <nav class="nav-shell">
      ${button('spin', 'Vòng quay')}
      ${button('bank', 'Ngân hàng')}
      ${button('settings', 'Cài đặt')}
    </nav>
  `;
}

export function render(): void {
  const content = Core.runtime.tab === 'spin' ? renderSpinTab() : Core.runtime.tab === 'bank' ? renderQuestionTab() : renderSettingsTab();

  appRoot.innerHTML = `
    <div class="app-shell">
      <header class="app-header">
        <div>
          <div class="eyebrow">QuizSpin</div>
          <h1>Vòng quay kiến thức offline</h1>
        </div>
        <div class="header-pills">
          <span class="mini-pill">${Core.state.categories.length} lĩnh vực</span>
          <span class="mini-pill">${Core.state.categories.reduce((count, category) => count + category.questions.length, 0)} câu</span>
        </div>
      </header>

      ${renderTabs()}

      <main class="content-area">
        ${content}
      </main>

      ${Core.runtime.toast ? `<div class="toast">${Core.runtime.toast}</div>` : ''}
      ${renderModal()}
    </div>
  `;

  bindEvents();
}

function bindEvents(): void {
  appRoot.querySelectorAll<HTMLElement>('[data-action="switch-tab"]').forEach((button) => {
    button.addEventListener('click', () => {
      Core.runtime.tab = button.dataset.tab as 'spin' | 'bank' | 'settings';
      render();
    });
  });

  appRoot.querySelectorAll<HTMLElement>('[data-action="select-category"]').forEach((button) => {
    button.addEventListener('click', () => {
      const id = button.dataset.id;
      if (id) {
        Core.selectCategory(id);
      }
    });
  });

  appRoot.querySelectorAll<HTMLElement>('[data-action="start-edit-question"]').forEach((button) => {
    button.addEventListener('click', () => {
      Core.runtime.editingQuestionId = button.dataset.id ?? null;
      Core.ensureQuestionDraft(Core.currentCategory());
      render();
    });
  });

  appRoot.querySelectorAll<HTMLElement>('[data-action="save-question-edit"]').forEach((button) => {
    button.addEventListener('click', () => {
      const id = button.dataset.id;
      const questionInput = appRoot.querySelector<HTMLInputElement>(`[data-field="edit-question"][data-id="${id}"]`);
      const answerInput = appRoot.querySelector<HTMLInputElement>(`[data-field="edit-answer"][data-id="${id}"]`);
      const optionsInput = appRoot.querySelector<HTMLTextAreaElement>(`[data-field="edit-options"][data-id="${id}"]`);
      if (!id || !questionInput || !answerInput || !optionsInput) {
        return;
      }
      Core.saveQuestionEdit(id, questionInput.value, optionsInput.value, answerInput.value);
    });
  });

  appRoot.querySelectorAll<HTMLElement>('[data-action="cancel-question-edit"]').forEach((button) => {
    button.addEventListener('click', () => {
      Core.runtime.editingQuestionId = null;
      Core.ensureQuestionDraft(Core.currentCategory());
      render();
    });
  });

  appRoot.querySelectorAll<HTMLElement>('[data-action="delete-question"]').forEach((button) => {
    button.addEventListener('click', () => {
      const id = button.dataset.id;
      const category = Core.currentCategory();
      if (!id || !category) {
        return;
      }
      if (!window.confirm('Xóa câu hỏi này?')) {
        return;
      }
      Core.deleteQuestion(category.id, id);
    });
  });

  appRoot.querySelectorAll<HTMLElement>('[data-action="rename-category"]').forEach((button) => {
    button.addEventListener('click', () => {
      const category = Core.currentCategory();
      if (category) {
        Core.renameCategory(category);
      }
    });
  });

  appRoot.querySelectorAll<HTMLElement>('[data-action="delete-category"]').forEach((button) => {
    button.addEventListener('click', () => {
      const category = Core.currentCategory();
      if (category) {
        Core.deleteCategory(category);
      }
    });
  });

  appRoot.querySelectorAll<HTMLElement>('[data-action="add-category"]').forEach((button) => {
    button.addEventListener('click', () => Core.addCategory());
  });

  appRoot.querySelectorAll<HTMLElement>('[data-action="save-question"]').forEach((button) => {
    button.addEventListener('click', () => Core.saveQuestionDraft());
  });

  const questionInput = appRoot.querySelector<HTMLTextAreaElement>('#question-input');
  const optionsInput = appRoot.querySelector<HTMLTextAreaElement>('#options-input');
  const answerInput = appRoot.querySelector<HTMLInputElement>('#answer-input');
  if (questionInput) {
    questionInput.addEventListener('input', () => {
      Core.runtime.questionDraft.question = questionInput.value;
    });
  }
  if (optionsInput) {
    optionsInput.addEventListener('input', () => {
      Core.runtime.questionDraft.options = optionsInput.value;
    });
  }
  if (answerInput) {
    answerInput.addEventListener('input', () => {
      Core.runtime.questionDraft.answer = answerInput.value;
    });
  }

  const timerSlider = appRoot.querySelector<HTMLInputElement>('#timer-slider');
  if (timerSlider) {
    timerSlider.addEventListener('input', () => {
      Core.setState((current) => ({
        ...current,
        settings: { ...current.settings, timer: Number(timerSlider.value) },
      }));
    });
  }

  const soundToggle = appRoot.querySelector<HTMLInputElement>('#sound-toggle');
  if (soundToggle) {
    soundToggle.addEventListener('change', () => {
      Core.setState((current) => ({
        ...current,
        settings: { ...current.settings, sound: soundToggle.checked },
      }));
    });
  }

  const giftsInput = appRoot.querySelector<HTMLTextAreaElement>('#gifts-input');
  if (giftsInput) {
    giftsInput.addEventListener('input', () => {
      Core.setState((current) => ({
        ...current,
        settings: { ...current.settings, gifts: textToRewardItems(giftsInput.value, current.settings.gifts, (text) => ({ id: crypto.randomUUID(), text })) },
      }));
      Core.runtime.usedGifts.clear();
    });
  }

  const punishmentsInput = appRoot.querySelector<HTMLTextAreaElement>('#punishments-input');
  if (punishmentsInput) {
    punishmentsInput.addEventListener('input', () => {
      Core.setState((current) => ({
        ...current,
        settings: { ...current.settings, punishments: textToRewardItems(punishmentsInput.value, current.settings.punishments, (text) => ({ id: crypto.randomUUID(), text })) },
      }));
      Core.runtime.usedPunishments.clear();
    });
  }

  const excelInput = appRoot.querySelector<HTMLInputElement>('#excel-input');
  if (excelInput) {
    excelInput.addEventListener('change', () => {
      const file = excelInput.files?.[0];
      if (file) {
        Core.parseExcelImport(file);
      }
      excelInput.value = '';
    });
  }

  appRoot.querySelectorAll<HTMLElement>('[data-action="spin"]').forEach((button) => {
    button.addEventListener('click', () => Core.spin());
  });

  appRoot.querySelectorAll<HTMLElement>('[data-action="toggle-pause"]').forEach((button) => {
    button.addEventListener('click', () => {
      if (!Core.runtime.modal || Core.runtime.modal.kind !== 'question') {
        return;
      }
      Core.toggleQuestionPause();
    });
  });

  appRoot.querySelectorAll<HTMLElement>('[data-action="reveal-answer"]').forEach((button) => {
    button.addEventListener('click', () => {
      Core.revealAnswer();
    });
  });

  appRoot.querySelectorAll<HTMLElement>('[data-action="close-modal"]').forEach((button) => {
    button.addEventListener('click', () => Core.closeModal());
  });

  appRoot.querySelectorAll<HTMLElement>('[data-action="clear-all"]').forEach((button) => {
    button.addEventListener('click', () => Core.clearEverything());
  });
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function escapeAttr(value: string): string {
  return escapeHtml(value).replaceAll("'", '&#39;');
}
