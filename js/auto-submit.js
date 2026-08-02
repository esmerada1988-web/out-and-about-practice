/**
 * auto-submit.js — 学生成绩自动提交脚本
 * 加载后会自动接管 generateScoreCode() 函数：
 * 1. 先尝试 POST /api/submit 自动提交（Vercel 环境下可用）
 * 2. 如果失败（GitHub Pages 或网络问题），回退到原始成绩码方案
 */
(function () {
  function getSource() {
    var path = window.location.pathname.toLowerCase();
    if (path.indexOf('think1-u1') >= 0 || path.indexOf('think1_u1') >= 0) return 'THINK1 U1';
    if (path.indexOf('think1-u2') >= 0 || path.indexOf('think1_u2') >= 0) return 'THINK1 U2';
    if (path.indexOf('out-and-about') >= 0 || path === '/' || path.indexOf('index.html') >= 0) return 'Out & About';
    return document.title || 'Practice';
  }

  function initAutoSubmit() {
    if (window._autoSubmitInitialized) return;
    window._autoSubmitInitialized = true;

    // 保存原始函数
    var originalGenerateScoreCode = window.generateScoreCode;

    // 覆盖
    window.generateScoreCode = async function () {
      var nameInput = document.getElementById('studentName');
      var name = nameInput ? nameInput.value.trim() : '';
      if (!name) {
        if (nameInput) {
          nameInput.style.borderColor = '#e53935';
          nameInput.focus();
          nameInput.placeholder = '请先输入姓名！';
        } else {
          alert('请先输入姓名');
        }
        return;
      }

      var st = window.state || {};
      var total = (st.correct || 0) + (st.wrong || 0);
      var pct = total > 0 ? Math.round((st.correct || 0) / total * 100) : 0;

      var scoreData = {
        name: name,
        source: getSource(),
        mode: st.modeLabel || st.mode || '',
        score: st.score || 0,
        correct: st.correct || 0,
        wrong: st.wrong || 0,
        total: total,
        pct: pct
      };

      // 按钮变 loading
      var btn = document.querySelector('button[onclick*="generateScoreCode"]');
      if (btn) { btn.textContent = '⏳ 提交中...'; btn.disabled = true; }

      try {
        var resp = await fetch('/api/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(scoreData)
        });

        if (resp.ok) {
          var data = await resp.json();
          if (data.success) {
            var section = document.querySelector('.submit-section');
            if (section) {
              section.innerHTML =
                '<div style="padding:24px 16px;text-align:center;background:linear-gradient(135deg,#e8f5e9,#c8e6c9);border-radius:16px;">' +
                '<div style="font-size:48px;margin-bottom:8px;">✅</div>' +
                '<div style="font-size:20px;font-weight:700;color:#2e7d32;margin-bottom:4px;">成绩已自动提交给老师！</div>' +
                '<div style="font-size:14px;color:#4caf50;">' + name + '，本次得分 ' + pct + ' 分（答对 ' + (st.correct || 0) + ' / ' + total + '）</div>' +
                '</div>';
            }
            return;
          }
        }
      } catch (e) {
        // 网络错误或 API 不可用，回退
      }

      // 回退：调用原始函数
      if (btn) { btn.textContent = '生成成绩码'; btn.disabled = false; }
      if (originalGenerateScoreCode) {
        return originalGenerateScoreCode.apply(null, arguments);
      }
    };

    // 动态更新按钮文字
    var observer = new MutationObserver(function () {
      document.querySelectorAll('button[onclick*="generateScoreCode"]').forEach(function (btn) {
        if (!btn.disabled && btn.textContent.indexOf('提交中') < 0) {
          btn.textContent = '📤 提交成绩给老师';
        }
      });
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAutoSubmit);
  } else {
    initAutoSubmit();
  }
})();
