// static/script.js

document.addEventListener('layoutloaded', () => {
  console.log('layoutloaded event received, starting script.');

  // screen.html 以外では実行しない
  // (screen.html が screenId をグローバルに定義する前提)
  if (typeof screenId === "undefined") {
      console.error("screenId not found, script will not run.");
      return; 
  }

  const container = document.getElementById("current-showing");
  const completeSaveBtn = document.getElementById("complete-save-btn");
  const saveStatusEl = document.getElementById("save-status");
  const dateInput = document.getElementById("date-input");
  
  const urlParams = new URLSearchParams(window.location.search);
  const editShowingId = urlParams.get('showing_id');
  const editDate = urlParams.get('date');
  let isEditMode = (editShowingId !== null);
  
  let currentShowing = null; 
  let showings = []; 

  //--- ▼▼▼ iPadストレージ (localStorage) ヘルパー ▼▼▼ ---
  const DB_KEY = "myCleaningAppDatabase";
  const getDatabase = () => JSON.parse(localStorage.getItem(DB_KEY) || "{}");
  const saveDatabase = (db) => localStorage.setItem(DB_KEY, JSON.stringify(db));
  //--- ▲▲▲ iPadストレージ (localStorage) ヘルパー ▲▲▲ ---

  const showSaveStatus = (txt) => {
    saveStatusEl.innerText = txt;
    if (txt && txt !== "保存中...") {
      setTimeout(() => {
        if (saveStatusEl.innerText === txt) saveStatusEl.innerText = "";
      }, 1200);
    }
  };
  
  const newShowing = () => {
    const s = { title: "", times: [], cleaner: "", overallRemark: "", rows: {} };
    s.id = Date.now().toString() + Math.random().toString(36).slice(2,10);
    
    // SEAT_STRUCTURE は screen.html が読み込み済みの前提
    Object.entries(SEAT_STRUCTURE).forEach(([row, seatArray]) => {
      s.rows[row] = { 
        rowCleaner: "", 
        seats: Array(seatArray.length).fill(false)
      };
    });
    return s;
  };
  
  //--- 処理ロジック ---
  const loadData = () => {
    if (isEditMode && editDate) {
        dateInput.value = editDate;
        dateInput.disabled = true; 
    }
    const dateToLoad = dateInput.value;
    
    const db = getDatabase();
    const key = `${dateToLoad}_${screenId}`;
    
    showings = db[key] || []; 
    
    if (isEditMode) {
        currentShowing = showings.find(s => s.id === editShowingId);
        if (!currentShowing) {
            alert("編集対象のデータが見つかりませんでした。新規入力画面に切り替えます。");
            isEditMode = false;
            dateInput.disabled = false;
            currentShowing = newShowing();
        }
    } else {
        currentShowing = newShowing();
    }
    
    renderCurrentShowing();
  };
  
  const completeAndSave = () => {
    if (!currentShowing.title.trim() && !currentShowing.cleaner.trim()) {
        if (!confirm('作品名または担当者が入力されていませんが、保存しますか？')) return;
    }
    
    showSaveStatus("保存中...");
    
    if (!isEditMode) {
        showings.push(currentShowing);
    }
    
    try {
      const dateToSave = dateInput.value;
      const key = `${dateToSave}_${screenId}`;
      
      const db = getDatabase();
      db[key] = showings; 
      saveDatabase(db);
      
      if (isEditMode) {
          showSaveStatus("保存しました！履歴ページに戻ります。");
          setTimeout(() => {
              window.location.href = 'records.html'; 
          }, 1000);
      } else {
          showSaveStatus("保存しました！画面をリセットします。");
          loadData(); 
      }

    } catch (e) {
      console.error(e);
      showSaveStatus("保存エラー");
      if (!isEditMode) {
          showings.pop(); 
      }
    }
  };

  const renderCurrentShowing = () => {
    const s = currentShowing;
    
    completeSaveBtn.removeEventListener("click", completeAndSave);
    dateInput.removeEventListener("change", loadData);

    if (!isEditMode) {
        dateInput.addEventListener("change", loadData); 
    }

    container.innerHTML = `
      <h2>${isEditMode ? '清掃記録の編集' : '清掃記録の新規入力'}</h2>
      <div id="form-fields-container">
        <div id="form-fields-left">
          <label class="d-block">作品名: 
            <input type="text" value="${s.title || ""}" data-field="title" class="form-control" placeholder="例: スパイファミリー">
          </label>
          <label class="d-block">時間: 
            <input type="text" value="${(s.times||[]).join(", ")}" data-field="times" class="form-control" placeholder="開始時間を記入 例: 10:00">
          </label>
          <label class="d-block">清掃者名: 
            <input type="text" value="${s.cleaner || ""}" data-field="cleaner" class="form-control" placeholder="例: 東宝">
          </label>
        </div>
        <div id="form-fields-right">
          <label class="d-block">備考欄:
            <textarea data-field="overallRemark" class="form-control" placeholder="備考欄 (例: 座席濡れ 等)">${s.overallRemark || ""}</textarea>
          </label>
        </div>
      </div>
      <hr>
      <h3>座席清掃チェックリスト</h3>
      <div class="seat-map">${renderSeatMap(s.rows)}</div>
    `;
    
    completeSaveBtn.innerText = isEditMode ? '✅ 編集を保存' : '✅ 清掃記録を完了・保存';
    
    attachEventListeners();
  };

  const attachEventListeners = () => {
      container.querySelectorAll("input[data-field], textarea[data-field]").forEach(inp => { 
        inp.addEventListener("input", e => {
          const field = e.target.dataset.field;
          if (field === "times") currentShowing.times = e.target.value.split(",").map(t => t.trim()).filter(t => t);
          else currentShowing[field] = e.target.value;
        });
      });
      
      container.querySelectorAll(".row-cleaner-input").forEach(inp => {
        inp.addEventListener("input", e => {
            const r = e.target.dataset.row;
            currentShowing.rows[r].rowCleaner = e.target.value;
        });
      });

      container.querySelectorAll(".copy-cleaner-btn").forEach(btn => {
        btn.addEventListener("click", e => {
            e.preventDefault(); 
            const currentRow = e.target.dataset.row; 
            const allRows = Object.keys(SEAT_STRUCTURE);
            const currentIndex = allRows.indexOf(currentRow);
            
            if (currentIndex < (allRows.length - 1)) { 
                const nextRow = allRows[currentIndex + 1]; 
                const nextCleanerName = currentShowing.rows[nextRow].rowCleaner; 
                
                if (nextCleanerName) {
                    currentShowing.rows[currentRow].rowCleaner = nextCleanerName; 
                    const inputEl = container.querySelector(`.row-cleaner-input[data-row="${currentRow}"]`);
                    if (inputEl) inputEl.value = nextCleanerName;
                }
            }
        });
      });

      container.querySelectorAll(".seat-box").forEach(box => {
        box.addEventListener("click", e => {
            const row = box.dataset.row;
            const index = parseInt(box.dataset.index, 10);
            currentShowing.rows[row].seats[index] = !currentShowing.rows[row].seats[index];
            renderCurrentShowing();
        });
      });

      container.querySelectorAll(".row-check-all-btn").forEach(btn => {
        btn.addEventListener("click", e => {
            const row = btn.dataset.row;
            const rowData = currentShowing.rows[row];
            const seatArray = SEAT_STRUCTURE[row]; 
            const isAllCleaned = rowData.seats.every((cleaned, index) => seatArray[index] === null ? true : cleaned);
            
            if (isAllCleaned) {
                rowData.seats = rowData.seats.map(() => false);
            } else {
                rowData.seats = rowData.seats.map((_, index) => seatArray[index] !== null);
            }
            renderCurrentShowing();
        });
      });
      
      completeSaveBtn.addEventListener("click", completeAndSave);
  };
  
  const renderSeatMap = (rowsData) => {
    let html = '';
    html += `<div class="seat-map-title">SCREEN ${screenId}</div>`;
    let rowIndex = 0; 
    const allRowKeys = Object.keys(SEAT_STRUCTURE); 

    allRowKeys.forEach((row) => {
        const seatArray = SEAT_STRUCTURE[row];
        const rowState = rowsData[row] || { rowCleaner: "", seats: Array(seatArray.length).fill(false) };
        const rowCleanerValue = rowState.rowCleaner || '';
        const isAllCleaned = rowState.seats.every((cleaned, index) => seatArray[index] === null ? true : cleaned); 
        const buttonText = isAllCleaned ? "✖" : "✔";
        const buttonClass = isAllCleaned ? "btn-outline-secondary" : "btn-outline-primary";
        
        html += `<div class="row-row row-${row}"> 
            <div class="row-label">${row}</div>
            <div class="seat-boxes">`;
        
        seatArray.forEach((seatId, i) => {
            if (seatId === null) {
                html += `<div class="aisle"></div>`;
            } else {
                const isCleaned = rowState.seats[i];
                const isWheelchair = (WHEELCHAIR_SEATS[row] && WHEELCHAIR_SEATS[row].includes(parseInt(seatId, 10)));
                let classList = "seat-box";
                if (isCleaned) classList += " cleaned";
                if (isWheelchair) classList += " wheelchair";
                const seatContent = isWheelchair ? "♿" : ""; 
                const seatTitle = seatId; 
                html += `<div class="${classList}" data-row="${row}" data-index="${i}" title="${seatTitle}">${seatContent}</div>`;
            }
        });
        
        const placeholderText = "担当者名";
        let copyButtonHtml = '';
        if (rowIndex < (allRowKeys.length - 1)) { 
            copyButtonHtml = `<button class="btn btn-sm btn-outline-secondary copy-cleaner-btn" data-row="${row}" title="下の担当者をコピー">↑</button>`;
        }

        html += `</div>
            <div class="cleaner-actions">
                <button class="row-check-all-btn btn btn-sm ${buttonClass}" data-row="${row}">${buttonText}</button>
                <input type="text" value="${rowCleanerValue}" data-row="${row}" class="row-cleaner-input form-control form-control-sm" placeholder="${placeholderText}">
                ${copyButtonHtml}
            </div>
        </div>`;
        rowIndex++; 
    });
    return html;
  };

  loadData();

});

