(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const MAX_FILE_SIZE = 20 * 1024 * 1024;
  let mounted = false;

  function mount() {
    const pages = $("pages");
    if (!pages) return false;
    if (!$("pg-upload")) {
      const section = document.createElement("section");
      section.id = "pg-upload";
      section.className = "view";
      section.innerHTML =
        '<div class="card">' +
          '<div class="section-head"><div><h2>Upload file · Catbox</h2><p class="hint">Tải file lên và nhận đường dẫn để chia sẻ.</p></div><span class="tag">Catbox</span></div>' +
          '<div class="upload-warning"><strong>Lưu ý:</strong> File tải lên là công khai. Upload ẩn danh có thể không xóa lại được. Không tải lên mật khẩu, token, thông tin cá nhân hoặc file riêng tư.</div>' +
          '<div class="field"><label for="catboxFile">Chọn file (tối đa 20 MB)</label><input id="catboxFile" class="input" type="file"></div>' +
          '<p id="catboxFileInfo" class="upload-file-info">Chưa chọn file.</p>' +
          '<div class="toolbar"><button id="catboxUploadBtn" type="button" class="btn primary">Upload lên Catbox</button></div>' +
          '<p id="catboxStatus" class="result hidden" role="status" aria-live="polite"></p>' +
          '<div id="catboxResult" class="hidden"><div class="field"><label for="catboxUrl">Link file</label><div class="upload-result"><input id="catboxUrl" class="input mono" type="url" readonly><button id="catboxCopy" type="button" class="btn">Sao chép link</button><a id="catboxOpen" class="btn" target="_blank" rel="noopener noreferrer">Mở file</a></div></div></div>' +
        '</div>';
      pages.appendChild(section);
    }
    if (mounted) return true;
    mounted = true;
    const fileInput = $("catboxFile");
    const info = $("catboxFileInfo");
    const status = $("catboxStatus");
    const result = $("catboxResult");
    const uploadButton = $("catboxUploadBtn");
    const urlInput = $("catboxUrl");
    fileInput.addEventListener("change", () => {
      const file = fileInput.files?.[0];
      info.textContent = file ? file.name + " · " + formatBytes(file.size) : "Chưa chọn file.";
      status.classList.add("hidden");
      result.classList.add("hidden");
    });
    uploadButton.addEventListener("click", async () => {
      const file = fileInput.files?.[0];
      if (!file) { setStatus("Vui lòng chọn file cần upload.", true); return; }
      if (file.size < 1) { setStatus("File đang rỗng.", true); return; }
      if (file.size > MAX_FILE_SIZE) { setStatus("File vượt quá giới hạn 20 MB.", true); return; }
      const cfg = window.BDZ_CONFIG;
      const token = sessionStorage.getItem("bdz_t") || "";
      if (!cfg?.SUPABASE_URL || !cfg?.SUPABASE_PUBLISHABLE_KEY || !token) {
        setStatus("Phiên đăng nhập hết hạn hoặc thiếu cấu hình. Hãy đăng nhập lại.", true);
        return;
      }
      const body = new FormData();
      body.append("p_token", token);
      body.append("fileToUpload", file, file.name);
      uploadButton.disabled = true;
      result.classList.add("hidden");
      setStatus("Đang tải file lên Catbox…", false);
      try {
        const response = await fetch(cfg.SUPABASE_URL.replace(/\/$/, "") + "/functions/v1/admin-catbox-upload", {
          method: "POST",
          headers: {
            apikey: cfg.SUPABASE_PUBLISHABLE_KEY,
            Authorization: "Bearer " + cfg.SUPABASE_PUBLISHABLE_KEY,
          },
          body,
          cache: "no-store",
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || !payload?.ok || !payload?.url) {
          const messages = {
            UNAUTHORIZED: "Phiên đăng nhập không hợp lệ. Hãy đăng nhập lại.",
            OWNER_ONLY: "Chỉ OWNER được sử dụng chức năng upload.",
            FILE_TOO_LARGE: "File vượt quá giới hạn 20 MB.",
            FILE_REQUIRED: "Chưa chọn file hợp lệ.",
            EMPTY_FILE: "File đang rỗng.",
            FILE_TYPE_BLOCKED: "Định dạng file này bị Catbox chặn.",
            CATBOX_UPSTREAM: "Catbox từ chối upload. Hãy thử file khác.",
            CATBOX_INVALID_RESPONSE: "Catbox trả về phản hồi không hợp lệ.",
            UPLOAD_FAILED: "Upload thất bại. Vui lòng thử lại.",
          };
          throw new Error(messages[payload?.error] || payload?.error || "Upload thất bại.");
        }
        urlInput.value = payload.url;
        $("catboxOpen").href = payload.url;
        result.classList.remove("hidden");
        setStatus("Upload thành công · " + formatBytes(payload.size_bytes || file.size), false);
      } catch (error) {
        setStatus(error?.message || "Không thể upload file.", true);
      } finally {
        uploadButton.disabled = false;
      }
    });
    $("catboxCopy").addEventListener("click", async () => {
      const value = urlInput.value.trim();
      if (!value) return;
      try {
        await navigator.clipboard.writeText(value);
        setStatus("Đã sao chép link.", false);
      } catch {
        urlInput.focus();
        urlInput.select();
        const copied = document.execCommand("copy");
        setStatus(copied ? "Đã sao chép link." : "Hãy sao chép link thủ công.", !copied);
      }
    });
    function setStatus(message, isError) {
      const el = $("catboxStatus");
      el.textContent = message;
      el.classList.toggle("err", !!isError);
      el.classList.remove("hidden");
    }
    function formatBytes(value) {
      const bytes = Number(value) || 0;
      if (bytes < 1024) return bytes + " B";
      if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
      return (bytes / (1024 * 1024)).toFixed(1) + " MB";
    }
    return true;
  }

  window.initCatboxUploadPage = mount;
  function boot() {
    let tries = 0;
    const poll = () => {
      if (mount()) return;
      if (++tries < 50) setTimeout(poll, 100);
    };
    poll();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
})();
