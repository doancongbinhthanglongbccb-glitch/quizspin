import type { AppState } from '../../core/state';
import { rewardItemsToText } from '../../data';

export function renderSettingsTab(appState: AppState): string {
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
            <input id="timer-slider" type="range" min="10" max="60" value="${appState.settings.timer}" />
            <span class="slider-value">${appState.settings.timer}s</span>
          </div>
        </div>

        <div class="card">
          <div class="card-title">Âm thanh</div>
          <label class="toggle-row">
            <span>Bật/tắt toàn bộ âm thanh</span>
            <input id="sound-toggle" type="checkbox" ${appState.settings.sound ? 'checked' : ''} />
          </label>
        </div>

        <div class="card">
          <div class="card-title">Danh sách Quà tặng</div>
          <textarea class="textarea" id="gifts-input" placeholder="Được cộng thêm 10đ\nNghỉ 1 lượt miễn phí">${rewardItemsToText(appState.settings.gifts)}</textarea>
        </div>

        <div class="card">
          <div class="card-title">Danh sách Hình phạt</div>
          <textarea class="textarea" id="punishments-input" placeholder="Chống đẩy 10 cái\nHát 1 bài">${rewardItemsToText(appState.settings.punishments)}</textarea>
        </div>
      </div>

      <div class="danger-zone">
        <button class="btn btn-danger btn-danger--wide" data-action="clear-all">Xóa sạch toàn bộ kho câu hỏi</button>
      </div>
    </section>
  `;
}
