// --- lop-hoc-frontend/src/App.jsx ---
// (PHIÊN BẢN MỚI 3.8) - Fix GIẬT PDF + Fix MẤT AUDIO
// PHIÊN BẢN ĐẦY ĐỦ 100%

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';

const SERVER_URL = 'https://lophocquyenkhoa.onrender.com';

// (FIX) Cập nhật link PDF.js (v3.11.174)
const PDFJS_SCRIPT_URL = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
const PDFJS_WORKER_URL = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';


// --- (FIX 1) Sửa lại hook useScript cho chính xác ---
function useScript(url) {
  const [isLoaded, setIsLoaded] = useState(false);
  
  useEffect(() => {
    // 1. Kiểm tra xem script đã tồn tại chưa
    const existingScript = document.querySelector(`script[src="${url}"]`);
    if (existingScript) {
      setIsLoaded(true);
      return; // Nếu có rồi thì không tải nữa
    }

    // 2. Nếu chưa có, tạo thẻ script mới
    const script = document.createElement('script');
    script.src = url;
    script.async = true;

    // 3. Xử lý khi tải xong
    script.onload = () => {
      setIsLoaded(true);
    };

    // 4. Xử lý khi tải lỗi
    script.onerror = () => {
      console.error(`Lỗi khi tải script: ${url}`);
    };

    // 5. Thêm script vào trang
    document.body.appendChild(script);

    // 6. Hàm "dọn dẹp" khi component bị gỡ
    return () => {
      if (script && document.body.contains(script)) {
         document.body.removeChild(script);
      }
    };
  }, [url]); // Chỉ chạy lại khi url thay đổi

  return isLoaded;
}


function AppStyles() {
  return (
    <style>{`
/* --- CSS ĐẦY ĐỦ CHO TOÀN BỘ APP --- */
/* --- Cài đặt chung & Font chữ --- */
      body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; background-color: #f3f4f6; }
      * { box-sizing: border-box; }
      
/* --- CSS CHO TABS (Cột chính) --- */
      .view-tabs { display: flex; border-bottom: 2px solid #e5e7eb; margin-bottom: 1rem; }
      .tab-button { padding: 0.75rem 1.5rem; font-size: 1rem; font-weight: 600; border: none; background-color: transparent; color: #6b7280; cursor: pointer; border-bottom: 4px solid transparent; margin-bottom: -2px; }
      .tab-button.active { color: #4f46e5; border-bottom-color: #4f46e5; }
      .tab-button:disabled { color: #9ca3af; cursor: not-allowed; }

/* --- CSS CHO PDF VIEWER --- */
      .pdf-viewer-container { flex: 1; display: flex; flex-direction: column; background-color: #52525B; /* zinc-600 */ border-radius: 0.5rem; box-shadow: inset 0 2px 4px 0 rgba(0, 0, 0, 0.06); border: 1px solid #e5e7eb; overflow: hidden; }
      
      .pdf-display { 
        flex: 1; 
        display: flex; 
        align-items: center; 
        justify-content: center; 
        overflow: auto; /* Cho phép cuộn nếu PDF quá to */
        padding: 1rem; 
        position: relative;
      }
      
      /* Container cho 2 canvas chồng lên nhau */
      .pdf-canvas-stack {
        position: relative;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      }
      
      /* Canvas NỀN (hiển thị PDF) */
      .pdf-render-canvas {
        position: absolute;
        top: 0;
        left: 0;
        z-index: 1;
      }
      
      /* Canvas VẼ (nét đỏ) */
      .pdf-draw-canvas {
        position: absolute;
        top: 0;
        left: 0;
        z-index: 5;
        cursor: crosshair;
      }

      .pdf-placeholder { color: #d1d5db; text-align: center; }
      
      /* Thanh công cụ PDF */
      .pdf-controls { padding: 0.75rem; background-color: white; border-top: 1px solid #e5e7eb; display: flex; align-items: center; justify-content: space-between; gap: 1rem; flex-wrap: wrap; }
      .pdf-upload-label { padding: 0.5rem 1rem; font-size: 0.875rem; background-color: #3b82f6; color: white; border: none; border-radius: 0.375rem; cursor: pointer; font-weight: 600; }
      .pdf-upload-label:hover { background-color: #2563eb; }
      .pdf-nav-buttons { display: flex; align-items: center; gap: 1rem; }
      .pdf-nav-button { padding: 0.5rem 1rem; font-size: 0.875rem; background-color: #e0e7ff; color: #4f46e5; border: none; border-radius: 0.375rem; cursor: pointer; font-weight: 600; }
      .pdf-nav-button:disabled { background-color: #f3f4f6; color: #9ca3af; cursor: not-allowed; }
      
      /* Ô Nhập số trang */
      .page-input-container { display: flex; align-items: center; gap: 0.5rem; }
      .page-input {
        width: 70px;
        padding: 0.5rem;
        text-align: center;
        border: 1px solid #d1d5db;
        border-radius: 0.375rem;
        font-weight: 600;
      }
      .page-counter { font-weight: 600; color: #374151; font-size: 0.875rem; }
      

/* --- CSS SIDEBAR TABS --- */
      .sidebar-tabs {
        display: flex;
        border-bottom: 2px solid #e5e7eb;
        margin-bottom: 1rem;
      }
      .sidebar-tab-button {
        flex: 1;
        text-align: center;
        padding: 0.5rem 0.25rem;
        font-size: 0.875rem; /* sm */
        font-weight: 600;
        border: none;
        background-color: transparent;
        color: #6b7280; /* gray-500 */
        cursor: pointer;
        border-bottom: 3px solid transparent;
        margin-bottom: -2px;
        white-space: nowrap; /* Chống xuống dòng */
      }
      .sidebar-tab-button.active { color: #4f46e5; border-bottom-color: #4f46e5; }
      
      .sidebar-toggle-button {
        padding: 0.25rem 0.5rem;
        font-size: 0.75rem;
        border: none;
        background-color: #f3f4f6;
        color: #4b5563;
        cursor: pointer;
        margin-left: 8px;
        border-radius: 4px;
      }
      .sidebar-toggle-button:hover { background-color: #e5e7eb; }

/* --- CSS CÁC CÔNG CỤ (Tool, Quiz, YouTube) --- */
      .tool-container {
        flex: 1;
        display: flex;
        flex-direction: column;
        min-height: 300px;
        background-color: #f9fafb; /* gray-50 */
        border: 1px solid #e5e7eb;
        border-radius: 0.5rem;
        padding: 1rem;
        overflow-y: auto; 
      }
      .tool-title { font-size: 1.25rem; font-weight: 600; color: #1f2937; border-bottom: 1px solid #e5e7eb; padding-bottom: 0.5rem; margin: 0 0 1rem 0; }
      .tool-label { font-weight: 600; color: #374151; margin-bottom: 0.5rem; display: block; }
      .tool-input { width: 100%; padding: 0.5rem 1rem; border: 1px solid #d1d5db; border-radius: 0.5rem; font-size: 1rem; margin-bottom: 1rem; }
      .tool-textarea { width: 100%; padding: 0.5rem 1rem; border: 1px solid #d1d5db; border-radius: 0.5rem; font-size: 1rem; margin-bottom: 1rem; min-height: 100px; font-family: inherit; }
      .tool-button { width: 100%; padding: 0.75rem 1.5rem; font-weight: 700; font-size: 1rem; border: none; border-radius: 0.5rem; cursor: pointer; transition: all 0.2s ease-in-out; color: white; background-color: #22c55e; }
      .tool-button:hover { background-color: #16a34a; }
      .tool-button:disabled { background-color: #d1d5db; cursor: not-allowed; }
      .tool-button.secondary { background-color: #ef4444; margin-top: 0.5rem; }
      .tool-button.secondary:hover { background-color: #dc2626; }
      .tool-button.tertiary { background-color: #6366f1; margin-top: 0.5rem; }
      .tool-button.tertiary:hover { background-color: #4f46e5; }
      .quiz-question { font-size: 1.125rem; font-weight: 600; margin-bottom: 1rem; }
      .quiz-options { display: flex; flex-direction: column; gap: 0.5rem; }
      .quiz-option { padding: 0.75rem 1.25rem; border: 2px solid #e5e7eb; border-radius: 0.5rem; cursor: pointer; font-weight: 500; transition: all 0.2s; }
      .quiz-option.selected { background-color: #e0e7ff; border-color: #4f46e5; }
      .quiz-option.student-answered { background-color: #fef3c7; border-color: #f59e0b; }
      .quiz-option.correct { background-color: #d1fae5; border-color: #10b981; }
      .quiz-option.wrong { background-color: #fee2e2; border-color: #ef4444; }
      .quiz-option.disabled { cursor: not-allowed; opacity: 0.7; }
      .quiz-result-info { margin-top: 1rem; font-weight: 600; }
      .youtube-player-wrapper { position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; max-width: 100%; background: #000; border-radius: 0.5rem; margin-top: 1rem; }
      .youtube-player-wrapper iframe { position: absolute; top: 0; left: 0; width: 100%; height: 100%; }
      
/* --- CSS Chọn Vai trò --- */
      .role-selector-container { display: flex; align-items: center; justify-content: center; min-height: 100vh; }
      .role-selector-box { padding: 2.5rem; background-color: white; border-radius: 0.5rem; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05); text-align: center; }
      .role-selector-title { font-size: 1.875rem; font-weight: 700; margin-bottom: 1.5rem; color: #4f46e5; }
      .role-selector-prompt { margin-bottom: 2rem; color: #374151; }
      .role-selector-buttons { display: flex; gap: 1rem; }
      .role-button { flex: 1; padding: 0.75rem 1.5rem; font-weight: 600; border: none; border-radius: 0.5rem; box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06); cursor: pointer; transition: all 0.2s ease-in-out; }
      .role-button.teacher { color: white; background-color: #6366f1; }
      .role-button.teacher:hover { background-color: #4f46e5; }
      .role-button.student { color: #4f46e5; background-color: #e0e7ff; }
      .role-button.student:hover { background-color: #c7d2fe; }
      
/* --- CSS Layout Chung --- */
      .app-container { display: flex; flex-direction: column; height: 100vh; font-family: sans-serif; background-color: #f9fafb; }
      .app-header { display: flex; align-items: center; justify-content: space-between; padding: 1rem; background-color: white; box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1); z-index: 10; }
      .app-header h1 { font-size: 1.5rem; font-weight: 700; color: #4f46e5; margin: 0; }
      .connection-status { text-align: right; display: flex; align-items: center; gap: 1rem; }
      .connection-status .role-name { font-weight: 600; margin: 0; }
      .connection-status .status-indicator { font-size: 0.875rem; color: #10b981; font-weight: 500; }
      .main-content { display: flex; flex: 1; overflow: hidden; }
      .whiteboard-column { flex: 1; display: flex; flex-direction: column; padding: 1rem; transition: flex-basis 0.3s ease-in-out; }
      .sidebar-column { width: 384px; flex-shrink: 0; background-color: white; box-shadow: -5px 0 10px -5px rgba(0, 0, 0, 0.05); padding: 1rem; display: flex; flex-direction: column; overflow-y: auto; transition: width 0.3s ease-in-out; }
      .sidebar-column.expanded { width: 768px; }
      
/* --- CSS Bảng trắng --- */
      .whiteboard-container { flex: 1; display: flex; flex-direction: column; background-color: white; border-radius: 0.5rem; box-shadow: inset 0 2px 4px 0 rgba(0, 0, 0, 0.06); border: 1px solid #e5e7eb; overflow: hidden; }
      .whiteboard-toolbar { display: flex; align-items: center; padding: 0.5rem; border-bottom: 1px solid #e5e7eb; gap: 0.5rem; }
      .whiteboard-toolbar h3 { font-weight: 600; color: #374151; margin: 0; }
      .clear-button { margin-left: auto; padding: 0.25rem 0.75rem; font-size: 0.875rem; background-color: #ef4444; color: white; border: none; border-radius: 0.375rem; cursor: pointer; }
      .clear-button:hover { background-color: #dc2626; }
      .canvas-wrapper { flex: 1; position: relative; }
      .whiteboard-canvas { display: block; }

/* --- CSS Audio --- */
      .audio-container { display: flex; flex-direction: column; padding: 1rem; background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 0.5rem; }
      .audio-title { font-size: 1.25rem; font-weight: 600; color: #1f2937; border-bottom: 1px solid #e5e7eb; padding-bottom: 0.5rem; margin: 0 0 1rem 0; }
      .stream-button { width: 100%; padding: 0.75rem 1.5rem; font-weight: 700; font-size: 1rem; border: none; border-radius: 0.5rem; box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06); cursor: pointer; transition: all 0.2s ease-in-out; color: white; }
      .stream-button.start { background-color: #22c55e; }
      .stream-button.start:hover { background-color: #16a34a; }
      .stream-button.stop { background-color: #ef4444; }
      .stream-button.stop:hover { background-color: #dc2626; }
      .status-text { font-weight: 500; text-align: center; margin-top: 0.75rem; margin-bottom: 0; }
      .status-text.streaming { color: #ef4444; }
      .status-text.listening { color: #22c55e; }
      .audio-player { width: 100%; margin-top: 0.5rem; }

/* --- CSS Chat --- */
      .chat-box-container { flex: 1; display: flex; flex-direction: column; min-height: 300px; }
      .chat-box-title { font-size: 1.25rem; font-weight: 600; color: #1f2937; border-bottom: 1px solid #e5e7eb; padding-bottom: 0.5rem; margin: 0 0 1rem 0; }
      .chat-messages { flex: 1; overflow-y: auto; margin-bottom: 1rem; padding-right: 0.5rem; display: flex; flex-direction: column; gap: 1rem; }
      .message-wrapper { display: flex; flex-direction: column; }
      .message-wrapper.sent { align-items: flex-end; }
      .message-wrapper.received { align-items: flex-start; }
      .message-bubble { max-width: 80%; padding: 0.5rem 1rem; border-radius: 0.5rem; box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05); }
      .message-wrapper.sent .message-bubble { background-color: #6366f1; color: white; }
      .message-wrapper.received .message-bubble { background-color: #f3f4f6; color: #1f2937; }
      .message-sender { font-size: 0.875rem; font-weight: 600; margin: 0 0 0.25rem 0; }
      .message-text { margin: 0; word-wrap: break-word; }
      .message-timestamp { font-size: 0.75rem; opacity: 0.7; text-align: right; margin: 0.25rem 0 0 0; }
      .chat-form { display: flex; gap: 0.5rem; }
      .chat-input { flex: 1; padding: 0.5rem 1rem; border: 1px solid #d1d5db; border-radius: 0.5rem; font-size: 1rem; }
      .chat-input:focus { outline: none; border-color: #6366f1; box-shadow: 0 0 0 2px #c7d2fe; }
      .chat-submit-button { padding: 0.5rem 1.25rem; background-color: #6366f1; color: white; border: none; border-radius: 0.5rem; font-weight: 600; cursor: pointer; }
      .chat-submit-button:hover { background-color: #4f46e5; }
      
/* --- CSS TÍNH NĂNG MỚI (Giơ tay, Reactions) --- */

      /* Nút thông báo giơ tay */
      .hand-raise-button {
        padding: 0.5rem 1rem;
        font-weight: 700;
        border: none;
        border-radius: 0.375rem;
        cursor: pointer;
        background-color: #f59e0b; /* amber-500 */
        color: white;
        animation: pulse 1.5s infinite;
      }
      
      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.7; }
      }
      
      /* Khung công cụ tương tác của học sinh */
      .student-tools-container {
        padding: 1rem;
        margin-bottom: 1rem;
        background-color: #f9fafb; /* gray-50 */
        border: 1px solid #e5e7eb; /* gray-200 */
        border-radius: 0.5rem;
        text-align: center;
      }
      .student-tools-title {
        font-size: 1.125rem; /* lg */
        font-weight: 600;
        color: #1f2937; /* gray-800 */
        margin: 0 0 1rem 0;
      }
      .student-tools-buttons {
        display: flex;
        justify-content: space-around;
        gap: 0.5rem;
      }
      .student-tool-button {
        flex: 1;
        padding: 0.75rem 0.5rem;
        font-size: 1.5rem; /* 2xl */
        border: 2px solid #e5e7eb;
        border-radius: 0.5rem;
        cursor: pointer;
        background-color: white;
        transition: all 0.2s;
      }
      .student-tool-button:hover {
        background-color: #f3f4f6;
        border-color: #c7d2fe;
      }
      .student-tool-button.raised {
        background-color: #fef3c7; /* amber-100 */
        border-color: #f59e0b; /* amber-500 */
      }
      
      /* Tin nhắn Reaction trong Chat */
      .message-wrapper.reaction {
        align-items: center; /* Căn giữa */
        margin: 1rem 0;
      }
      .message-reaction-bubble {
        font-size: 3rem; /* 6xl */
        background-color: transparent;
        box-shadow: none;
        padding: 0;
        animation: pop-in 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      }
      
      @keyframes pop-in {
        0% { transform: scale(0.5); opacity: 0; }
        100% { transform: scale(1); opacity: 1; }
      }
      
    `}</style>
  );
}

// Component chính của ứng dụng
export default function App() {
  const [socket, setSocket] = useState(null);
  const [role, setRole] = useState(null); // 'teacher' hoặc 'student'
  
  const [currentView, setCurrentView] = useState('whiteboard');
  const [currentPDF, setCurrentPDF] = useState(null); 
  const [currentPage, setCurrentPage] = useState(1);
  const [pdfAnnotations, setPdfAnnotations] = useState({});
  
  const [sidebarTab, setSidebarTab] = useState('chat'); 
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false); 
  const [currentQuiz, setCurrentQuiz] = useState(null);
  const [currentYouTubeId, setCurrentYouTubeId] = useState(null);
  
  const [isHandRaised, setIsHandRaised] = useState(false);

  const isPdfJsLoaded = useScript(PDFJS_SCRIPT_URL);
  
  useEffect(() => {
    if (isPdfJsLoaded && window.pdfjsLib) {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_URL;
      console.log('PDF.js đã tải xong và sẵn sàng!');
    }
  }, [isPdfJsLoaded]);


  useEffect(() => {
    const newSocket = io(SERVER_URL, {
      maxHttpBufferSize: 1e8, // 100 MB
    });
    setSocket(newSocket);
    
    newSocket.on('classroom state', (state) => {
      console.log("Nhận được trạng thái lớp học:", state);
      setCurrentView(state.currentView);
      setCurrentPDF(state.currentPDF);
      setCurrentPage(state.currentPage);
      setPdfAnnotations(state.pdfAnnotations || {}); 
      setCurrentQuiz(state.currentQuiz);
      setCurrentYouTubeId(state.currentYouTubeId);
      setIsHandRaised(state.isHandRaised);
    });
    
    newSocket.on('view changed', (view) => { setCurrentView(view); });
    newSocket.on('pdf updated', (pdfData) => { setCurrentPDF(pdfData); setCurrentPage(1); setPdfAnnotations({}); });
    newSocket.on('page changed', (newPage) => { setCurrentPage(newPage); });
    newSocket.on('quiz updated', (quiz) => { setCurrentQuiz(quiz); });
    newSocket.on('youtube updated', (videoId) => { setCurrentYouTubeId(videoId); });
    
    newSocket.on('pdf draw event', (drawData) => {
      const { pageNum, eventType, data } = drawData;
      setPdfAnnotations((prevAnnotations) => {
        const newAnnotations = { ...prevAnnotations };
        if (!newAnnotations[pageNum]) {
          newAnnotations[pageNum] = [];
        }
        newAnnotations[pageNum] = [...newAnnotations[pageNum], { eventType, data }];
        return newAnnotations;
      });
    });
    
    newSocket.on('annotations cleared', (pageNum) => {
      setPdfAnnotations((prev) => ({ ...prev, [pageNum]: [] }));
    });
    
    newSocket.on('hand raised status', (status) => {
      setIsHandRaised(status);
    });

    return () => {
      newSocket.off('classroom state');
      newSocket.off('view changed');
      newSocket.off('pdf updated');
      newSocket.off('page changed');
      newSocket.off('quiz updated');
      newSocket.off('youtube updated');
      newSocket.off('pdf draw event');
      newSocket.off('annotations cleared');
      newSocket.off('hand raised status');
      newSocket.close();
    };
  }, []);

  // Giao diện chọn vai trò
  if (!role) {
    return (
      <>
        <AppStyles />
        <div className="role-selector-container">
          <div className="role-selector-box">
            <h1 className="role-selector-title">Chào mừng đến lớp học!</h1>
            <p className="role-selector-prompt">Cậu là...</p>
            <div className="role-selector-buttons">
              <button onClick={() => setRole('teacher')} className="role-button teacher">
                Chị Quyên (Giáo viên)
              </button>
              <button onClick={() => setRole('student')} className="role-button student">
                Em trai (Học sinh)
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  // Giao diện lớp học chính
  return (
    <>
      <AppStyles />
      <div className="app-container">
        <header className="app-header">
          <h1>Lớp học của Quyên</h1>
          <div className="connection-status">
            
            {role === 'teacher' && isHandRaised && (
              <button 
                className="hand-raise-button"
                onClick={() => socket.emit('teacher lower hand')}
              >
                ✋ Em trai đang giơ tay! (Nhấn để hạ tay)
              </button>
            )}
            
            <div style={{textAlign: 'right'}}>
              <p className="role-name">{role === 'teacher' ? 'Chị Quyên' : 'Em Trai'}</p>
              <span className="status-indicator">
                {socket ? '● Đã kết nối' : 'Đang kết nối...'}
              </span>
            </div>
          </div>
        </header>

        <div className="main-content">
          {/* Cột chính: Bảng trắng hoặc PDF */}
          <main className="whiteboard-column">
            <ViewTabs 
              socket={socket} 
              role={role} 
              currentView={currentView}
            />
            
            {currentView === 'whiteboard' ? (
              <Whiteboard socket={socket} role={role} />
            ) : (
              <PdfViewer 
                socket={socket} 
                role={role}
                pdfData={currentPDF} 
                currentPage={currentPage}
                annotations={pdfAnnotations[currentPage] || []}
                setAnnotations={(newAnnotations) => setPdfAnnotations({
                  ...pdfAnnotations,
                  [currentPage]: newAnnotations,
                })}
                isPdfJsLoaded={isPdfJsLoaded} 
              />
            )}
          </main>

          {/* Cột phụ: Nâng cấp với Tabs */}
          <aside className={`sidebar-column ${isSidebarExpanded ? 'expanded' : ''}`}>
            
            {role === 'student' && (
              <StudentInteractionTools 
                socket={socket} 
                isHandRaised={isHandRaised} 
              />
            )}
            
            <SidebarTabs 
              sidebarTab={sidebarTab} 
              setSidebarTab={setSidebarTab}
              isSidebarExpanded={isSidebarExpanded}
              setIsSidebarExpanded={setIsSidebarExpanded}
            />
            
            {sidebarTab === 'chat' && ( <ChatBox socket={socket} role={role} /> )}
            
            {sidebarTab === 'audio' && (
              role === 'teacher' ? ( <AudioStreamer socket={socket} /> ) : ( <AudioPlayer socket={socket} /> )
            )}
            
            {sidebarTab === 'quiz' && (
              <QuizTool 
                socket={socket} 
                role={role} 
                currentQuiz={currentQuiz} 
              />
            )}
            
            {sidebarTab === 'youtube' && (
              <YouTubeTool 
                socket={socket} 
                role={role} 
                currentYouTubeId={currentYouTubeId} 
              />
            )}

          </aside>
        </div>
      </div>
    </>
  );
}

// --- Component Tabs Cột chính ---
function ViewTabs({ socket, role, currentView }) {
  const setView = (viewName) => {
    if (role !== 'teacher') return; 
    socket.emit('change view', viewName);
  };
  return (
    <div className="view-tabs">
      <button className={`tab-button ${currentView === 'whiteboard' ? 'active' : ''}`} onClick={() => setView('whiteboard')} disabled={role !== 'teacher'}>
        Bảng trắng
      </button>
      <button className={`tab-button ${currentView === 'slides' ? 'active' : ''}`} onClick={() => setView('slides')} disabled={role !== 'teacher'}>
        Sách (PDF)
      </button>
    </div>
  );
}

// --- Component Tabs Cột phụ (Đã xóa AI) ---
function SidebarTabs({ sidebarTab, setSidebarTab, isSidebarExpanded, setIsSidebarExpanded }) {
  return (
    <div className="sidebar-tabs">
      <button className={`sidebar-tab-button ${sidebarTab === 'chat' ? 'active' : ''}`} onClick={() => setSidebarTab('chat')}>
        Chat
      </button>
      <button className={`sidebar-tab-button ${sidebarTab === 'audio' ? 'active' : ''}`} onClick={() => setSidebarTab('audio')}>
        Audio
      </button>
      <button className={`sidebar-tab-button ${sidebarTab === 'quiz' ? 'active' : ''}`} onClick={() => setSidebarTab('quiz')}>
        Quiz
      </button>
      <button className={`sidebar-tab-button ${sidebarTab === 'youtube' ? 'active' : ''}`} onClick={() => setSidebarTab('youtube')}>
        YouTube
      </button>
      
      <button 
        className="sidebar-toggle-button" 
        onClick={() => setIsSidebarExpanded(prev => !prev)}
        title={isSidebarExpanded ? "Thu nhỏ" : "Mở rộng"}
      >
        {isSidebarExpanded ? '<' : '>'}
      </button>
    </div>
  );
}

// --- (MỚI) Component Công cụ tương tác của Học sinh ---
function StudentInteractionTools({ socket, isHandRaised }) {
  
  const sendReaction = (emoji) => {
    if (!socket) return;
    const msgPayload = {
      id: `${socket.id}-${Date.now()}`,
      sender: 'student', // Cố định là student
      text: emoji,
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      isReaction: true, // (MỚI) Đánh dấu đây là reaction
    };
    socket.emit('chat message', msgPayload);
  };
  
  const handleRaiseHand = () => {
    if (!socket) return;
    socket.emit('student raise hand');
  }
  
  return (
    <div className="student-tools-container">
      <h3 className="student-tools-title">Tương tác nhanh</h3>
      <div className="student-tools-buttons">
        <button 
          className={`student-tool-button ${isHandRaised ? 'raised' : ''}`} 
          onClick={handleRaiseHand}
          disabled={isHandRaised} // Vô hiệu hóa nếu đang giơ tay
        >
          ✋
        </button>
        <button className="student-tool-button" onClick={() => sendReaction('👍')}>
          👍
        </button>
        <button className="student-tool-button" onClick={() => sendReaction('❤️')}>
          ❤️
        </button>
        <button className="student-tool-button" onClick={() => sendReaction('❓')}>
          ❓
        </button>
      </div>
    </div>
  );
}


// --- Component Trình chiếu PDF (FIX LỖI) ---
function PdfViewer({ 
  socket, role, 
  pdfData, 
  currentPage, 
  annotations, setAnnotations, 
  isPdfJsLoaded
}) {
  
  const [pdfDoc, setPdfDoc] = useState(null); 
  const [totalPages, setTotalPages] = useState(0);
  const [isRendering, setIsRendering] = useState(false);
  const [pageInput, setPageInput] = useState(currentPage); 

  const pdfCanvasRef = useRef(null); 
  const drawCanvasRef = useRef(null); 
  const drawContextRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  
  useEffect(() => {
    if (!pdfData || !isPdfJsLoaded || !window.pdfjsLib) return;
    const binaryData = atob(pdfData.split(',')[1]);
    setIsRendering(true);
    window.pdfjsLib.getDocument({ data: binaryData }).promise.then(doc => {
      setPdfDoc(doc);
      setTotalPages(doc.numPages);
      socket.emit('change page', 1);
    }).catch(err => {
      console.error("Lỗi khi tải PDF:", err);
      alert("Lỗi: Không thể đọc file PDF này.");
    });
  }, [pdfData, isPdfJsLoaded, socket]);
  
  useEffect(() => {
    setPageInput(currentPage);
  }, [currentPage]);
  

  // --- (FIX GIẬT 1/3) ---
  const renderPage = useCallback(async (pageNum) => {
    if (!pdfDoc) return;
    setIsRendering(true);
    
    try {
      const page = await pdfDoc.getPage(pageNum);
      const viewport = page.getViewport({ scale: 1.5 }); 
      const pdfCanvas = pdfCanvasRef.current;
      const drawCanvas = drawCanvasRef.current;
      if (!pdfCanvas || !drawCanvas) return;
      
      const pdfContext = pdfCanvas.getContext('2d');
      const dpr = window.devicePixelRatio || 1;
      
      pdfCanvas.width = viewport.width * dpr;
      pdfCanvas.height = viewport.height * dpr;
      pdfCanvas.style.width = `${viewport.width}px`;
      pdfCanvas.style.height = `${viewport.height}px`;
      
      drawCanvas.width = viewport.width * dpr;
      drawCanvas.height = viewport.height * dpr;
      drawCanvas.style.width = `${viewport.width}px`;
      drawCanvas.style.height = `${viewport.height}px`;

      const drawContext = drawCanvas.getContext('2d');
      drawContext.scale(dpr, dpr);
      drawContext.lineCap = 'round';
      drawContext.strokeStyle = 'red'; 
      drawContext.lineWidth = 4;
      drawContextRef.current = drawContext;
      
      await page.render({
        canvasContext: pdfContext,
        transform: [dpr, 0, 0, dpr, 0, 0], 
        viewport: viewport,
      }).promise;
      
      setIsRendering(false);
      
      // (FIX GIẬT) XÓA BỎ dòng này đi. Bọn mình không vẽ nét ở đây nữa.
      // redrawAnnotations(drawContext, annotations); 
      
    } catch (err) {
      console.error("Lỗi khi render trang:", err);
      setIsRendering(false);
    }
  }, [pdfDoc]); // <<< (FIX GIẬT 2/3) XÓA BỎ 'annotations'


  useEffect(() => {
    if (pdfDoc && currentPage > 0) {
      renderPage(currentPage);
    }
  }, [pdfDoc, currentPage, renderPage]);

  
  const redrawAnnotations = (ctx, annotationData) => {
    if (!ctx || !annotationData) return;
    
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    
    const oldColor = ctx.strokeStyle;
    ctx.strokeStyle = 'red'; 
    
    annotationData.forEach(event => {
      const { eventType, data } = event;
      if (eventType === 'start') {
        ctx.beginPath();
        ctx.moveTo(data.x, data.y);
      } else if (eventType === 'move') {
        ctx.lineTo(data.x, data.y);
        ctx.stroke();
      } else if (eventType === 'end') {
        ctx.closePath();
      }
    });
    ctx.strokeStyle = oldColor; 
  };
  
  useEffect(() => {
    if (drawContextRef.current) {
      // (FIX GIẬT 3/3) Khi render trang mới, bọn mình cũng phải gọi redraw ở đây
      // sau khi context đã sẵn sàng.
      // Và khi nét vẽ mới (annotations) thay đổi, cũng phải vẽ lại.
      redrawAnnotations(drawContextRef.current, annotations);
    }
  }, [annotations, isRendering]); // (FIX GIẬT) Thêm 'isRendering'


  // --- (FIX LỖI) CÁC HÀM XỬ LÝ VẼ (Mở khóa cho Student) ---
  const getDrawPos = (e) => {
    if (!drawCanvasRef.current) return {x: 0, y: 0};
    const rect = drawCanvasRef.current.getBoundingClientRect();
    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);
    if (clientX === undefined || clientY === undefined) return {x:0, y:0};
    
    const dpr = window.devicePixelRatio || 1;
    
    return {
      x: (clientX - rect.left) * (drawCanvasRef.current.width / dpr) / rect.width,
      y: (clientY - rect.top) * (drawCanvasRef.current.height / dpr) / rect.height,
    };
  };

  const startPdfDrawing = (e) => {
    // if (role !== 'teacher') return; // <<< (FIX) ĐÃ XÓA BỎ KHÓA
    if (e.touches) e.preventDefault();
    if (e.touches && e.touches.length > 1) return; 
    
    setIsDrawing(true);
    const { x, y } = getDrawPos(e.nativeEvent || e);
    
    if (!drawContextRef.current) return;
    drawContextRef.current.beginPath();
    drawContextRef.current.moveTo(x, y);
    
    const drawData = { x, y };
    socket.emit('pdf draw event', { pageNum: currentPage, eventType: 'start', data: drawData });
    setAnnotations([...annotations, { eventType: 'start', data: drawData }]);
  };

  const finishPdfDrawing = (e) => {
    // if (role !== 'teacher') return; // <<< (FIX) ĐÃ XÓA BỎ KHÓA
    if (e.touches) e.preventDefault();
    if (!isDrawing) return; // Thêm check
    setIsDrawing(false);
    if (!drawContextRef.current) return;
    drawContextRef.current.closePath();
    
    socket.emit('pdf draw event', { pageNum: currentPage, eventType: 'end' });
    setAnnotations([...annotations, { eventType: 'end' }]);
  };

  const drawOnPdf = (e) => {
    // if (role !== 'teacher') return; // <<< (FIX) ĐÃ XÓA BỎ KHÓA
    if (e.touches) e.preventDefault();
    if (!isDrawing) return;
    if (e.touches && e.touches.length > 1) return;

    const { x, y } = getDrawPos(e.nativeEvent || e);
    if (x === 0 && y === 0) return;

    if (!drawContextRef.current) return;
    drawContextRef.current.lineTo(x, y);
    drawContextRef.current.stroke();
    
    const drawData = { x, y };
    socket.emit('pdf draw event', { pageNum: currentPage, eventType: 'move', data: drawData });
    setAnnotations([...annotations, { eventType: 'move', data: drawData }]);
  };
  
  const handleClearSlide = () => {
    setAnnotations([]);
    if (drawContextRef.current) {
      drawContextRef.current.clearRect(0, 0, drawContextRef.current.canvas.width, drawContextRef.current.canvas.height);
    }
    socket.emit('clear pdf annotations', currentPage);
  }

  // --- (FIX LỖI) CÁC HÀM ĐIỀU KHIỂN (Upload) ---
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || file.type !== 'application/pdf') {
      alert("Cậu ơi, chỉ tải file PDF thôi nhé!");
      return;
    }
    
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      socket.emit('upload pdf', reader.result); // Gửi base64
    };
    reader.onerror = (error) => { // <<< (FIX) SỬA 'err' -> 'error'
       console.error("Lỗi khi đọc file PDF:", error); // <<< (FIX) SỬA 'err' -> 'error'
       alert("Đã xảy ra lỗi khi tải PDF."); 
    };
  };
  
  const goToPage = (pageNumber) => {
    let newPage = parseInt(pageNumber, 10);
    if (!pdfDoc || isNaN(newPage)) return;
    
    if (newPage < 1) newPage = 1;
    if (newPage > totalPages) newPage = totalPages;
    
    if (newPage !== currentPage) {
      socket.emit('change page', newPage);
    }
    setPageInput(newPage); 
  };
  
  const handlePageInputChange = (e) => {
    setPageInput(e.target.value);
  }
  
  const handlePageInputSubmit = (e) => {
    if (e.key === 'Enter') {
      goToPage(pageInput);
    }
  }


  return (
    <>
      <div className="pdf-viewer-container">
        {/* Vùng hiển thị PDF */}
        <div className="pdf-display">
          {!pdfDoc && (
            <div className="pdf-placeholder">
              {role === 'teacher' ? (<p>Hãy tải Sách giáo khoa (PDF) của cậu lên ở bên dưới nhé!</p>) : (<p>Chị Quyên chưa tải sách lên...</p>)}
              {!isPdfJsLoaded && <p>(Đang tải thư viện PDF...)</p>}
            </div>
          )}
          
          {isRendering && <p className="pdf-placeholder">Đang tải trang...</p>}
          
          <div className="pdf-canvas-stack" style={{ display: pdfDoc ? 'block' : 'none' }}>
            <canvas ref={pdfCanvasRef} className="pdf-render-canvas" />
            
            {/* (FIX) Canvas VẼ (Mở khóa cho cả 2) */}
            <canvas
              ref={drawCanvasRef}
              className="pdf-draw-canvas"
              onMouseDown={startPdfDrawing} // Gỡ bỏ check role
              onMouseUp={finishPdfDrawing}
              onMouseOut={finishPdfDrawing}
              onMouseMove={drawOnPdf}
              onTouchStart={startPdfDrawing}
              onTouchEnd={finishPdfDrawing}
              onTouchCancel={finishPdfDrawing}
              onTouchMove={drawOnPdf}
            />
          </div>

        </div>

        {/* Thanh công cụ (chỉ giáo viên thấy) */}
        {role === 'teacher' && (
          <div className="pdf-controls">
            <label className="pdf-upload-label">
              Tải Sách (PDF)
              <input type="file" accept="application/pdf" style={{ display: 'none' }} onChange={handleFileUpload} />
            </label>
            
            <button 
              className="pdf-nav-button" 
              onClick={handleClearSlide}
              style={{backgroundColor: '#fee2e2', color: '#ef4444'}}
              disabled={!pdfDoc}
            >
              Xóa nét vẽ
            </button>
            
            <div className="pdf-nav-buttons">
              <button className="pdf-nav-button" onClick={() => goToPage(currentPage - 1)} disabled={!pdfDoc || currentPage <= 1}>
                Trang trước
              </button>
              
              <div className="page-input-container">
                <input 
                  type="number"
                  className="page-input"
                  value={pageInput}
                  onChange={handlePageInputChange}
                  onKeyDown={handlePageInputSubmit}
                  disabled={!pdfDoc}
                />
                <span className="page-counter"> / {totalPages}</span>
              </div>
              
              <button className="pdf-nav-button" onClick={() => goToPage(currentPage + 1)} disabled={!pdfDoc || currentPage >= totalPages}>
                Trang sau
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}


// --- Component Bảng trắng ---
function Whiteboard({ socket, role }) {
  const canvasRef = useRef(null);
  const contextRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    if (!canvasRef.current) return; 
    const canvas = canvasRef.current;
    const container = canvas.parentElement;
    if (!container) return; 

    const setCanvasSize = () => {
      const width = container.clientWidth;
      const height = container.clientHeight;
      if (width === 0 || height === 0) return; 
      
      const dpr = window.devicePixelRatio || 1;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      
      const context = canvas.getContext('2d');
      context.scale(dpr, dpr);
      context.lineCap = 'round';
      context.strokeStyle = 'black';
      context.lineWidth = 4;
      contextRef.current = context;
    };
    
    setCanvasSize();
    const resizeObserver = new ResizeObserver(setCanvasSize);
    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    if (!socket) return;

    socket.on('draw start', (data) => {
      if (!contextRef.current) return;
      const { x, y, color } = data;
      const context = contextRef.current;
      const oldColor = context.strokeStyle;
      context.strokeStyle = color;
      context.beginPath();
      context.moveTo(x, y);
      context.strokeStyle = oldColor; 
    });

    socket.on('draw move', (data) => {
      if (!contextRef.current) return;
      const { x, y } = data;
      const context = contextRef.current;
      context.lineTo(x, y);
      context.stroke();
    });

    socket.on('draw end', () => {
      if (!contextRef.current) return;
      const context = contextRef.current;
      context.closePath();
    });

    socket.on('clear board', () => {
      clearCanvasLocal();
    });

    return () => {
      socket.off('draw start');
      socket.off('draw move');
      socket.off('draw end');
      socket.off('clear board');
    };
  }, [socket]);

  const getMousePos = (e) => {
    if (!canvasRef.current) return {x: 0, y: 0};
    const rect = canvasRef.current.getBoundingClientRect();
    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);
    if (clientX === undefined || clientY === undefined) return {x:0, y:0};
    
    const dpr = window.devicePixelRatio || 1;
    return {
      x: (clientX - rect.left), // * (canvasRef.current.width / dpr) / rect.width,
      y: (clientY - rect.top), // * (canvasRef.current.height / dpr) / rect.height,
    };
  };

  const startDrawing = (e) => {
    if (e.touches) e.preventDefault();
    if (e.touches && e.touches.length > 1) return; 
    if (!contextRef.current) return;
    
    setIsDrawing(true);
    const { x, y } = getMousePos(e.nativeEvent || e);
    contextRef.current.beginPath();
    contextRef.current.moveTo(x, y);
    socket.emit('draw start', { x, y, color: contextRef.current.strokeStyle });
  };

  const finishDrawing = (e) => {
    if (e.touches) e.preventDefault();
    if (!isDrawing) return;
    setIsDrawing(false);
    if (!contextRef.current) return;
    contextRef.current.closePath();
    socket.emit('draw end');
  };

  const draw = (e) => {
    if (e.touches) e.preventDefault();
    if (!isDrawing) return;
    if (e.touches && e.touches.length > 1) return;
    if (!contextRef.current) return;
    
    const { x, y } = getMousePos(e.nativeEvent || e);
    if (x === 0 && y === 0) return;
    const context = contextRef.current;
    context.lineTo(x, y);
    context.stroke();
    socket.emit('draw move', { x, y });
  };

  const clearCanvasLocal = () => {
     if (!canvasRef.current || !contextRef.current) return;
     const canvas = canvasRef.current;
     const context = contextRef.current;
     const dpr = window.devicePixelRatio || 1;
     context.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
  }
  
  const handleClearBoard = () => {
    clearCanvasLocal();
    socket.emit('clear board');
  }
  
  return (
    <div className="whiteboard-container">
      <div className="whiteboard-toolbar">
         <h3>Bảng trắng</h3>
         {/* Bảng trắng cũng nên cho cả 2 xóa */}
         <button onClick={handleClearBoard} className="clear-button">
            Xóa bảng
         </button>
      </div>
      <div className="canvas-wrapper">
        <canvas
          ref={canvasRef}
          className="whiteboard-canvas"
          onMouseDown={startDrawing}
          onMouseUp={finishDrawing}
          onMouseOut={finishDrawing}
          onMouseMove={draw}
          onTouchStart={startDrawing} 
          onTouchEnd={finishDrawing}
          onTouchCancel={finishDrawing}
          onTouchMove={draw}
        />
      </div>
    </div>
  );
}


// --- Component AudioStreamer (Giáo viên) ---
function AudioStreamer({ socket }) {
  const [isStreaming, setIsStreaming] = useState(false);
  const mediaRecorderRef = useRef(null);
  const userMediaStreamRef = useRef(null);

  const startStreaming = async () => {
    if (!socket) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      userMediaStreamRef.current = stream;
      const mime = 'audio/webm; codecs=opus';
      if (!MediaRecorder.isTypeSupported(mime)) {
        console.error("MIME type 'audio/webm; codecs=opus' không được hỗ trợ!");
        return;
      }
      const recorder = new MediaRecorder(stream, { mimeType: mime });
      mediaRecorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          socket.emit('audio chunk', event.data);
        }
      };
      recorder.start(1000); // Gửi chunk mỗi giây
      socket.emit('start stream');
      setIsStreaming(true);
    } catch (err) {
      console.error('Lỗi khi lấy mic:', err);
    }
  };

  const stopStreaming = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      userMediaStreamRef.current.getTracks().forEach(track => track.stop());
      socket.emit('stop stream');
      setIsStreaming(false);
    }
  };

  return (
    <div className="audio-container" style={{ marginBottom: 0 }}>
      <h3 className="audio-title">Bảng điều khiển Audio</h3>
      <button onClick={isStreaming ? stopStreaming : startStreaming} className={`stream-button ${isStreaming ? 'stop' : 'start'}`}>
        {isStreaming ? 'Dừng giảng' : 'Bắt đầu giảng'}
      </button>
      {isStreaming && (
        <p className="status-text streaming">● Đang thu âm...</p>
      )}
    </div>
  );
}

// --- Component AudioPlayer (Học sinh) ---
function AudioPlayer({ socket }) {
  const audioRef = useRef(null);
  const mediaSourceRef = useRef(null);
  const sourceBufferRef = useRef(null);
  const audioQueueRef = useRef([]);
  const [isListening, setIsListening] = useState(false);
  const isProcessingQueue = useRef(false); 

  const processQueue = useCallback(() => {
    if (isProcessingQueue.current || !sourceBufferRef.current || sourceBufferRef.current.updating || audioQueueRef.current.length === 0) {
      return;
    }
    isProcessingQueue.current = true; 
    try {
      const chunkToAppend = audioQueueRef.current.shift(); 
      sourceBufferRef.current.appendBuffer(chunkToAppend);
    } catch (e) {
      console.error("Lỗi khi append buffer:", e);
      audioQueueRef.current = []; 
      isProcessingQueue.current = false;
    }
  }, []); 

  useEffect(() => {
    mediaSourceRef.current = new MediaSource();
    const mediaSource = mediaSourceRef.current;
    const audio = audioRef.current;
    audio.src = URL.createObjectURL(mediaSource);
    
    const onSourceOpen = () => {
      if (mediaSource.readyState === 'open') {
         try {
            const mime = 'audio/webm; codecs=opus';
            if (!MediaSource.isTypeSupported(mime)) {
              console.error("MIME type 'audio/webm; codecs=opus' không được hỗ trợ!");
              return;
            }
            const sourceBuffer = mediaSource.addSourceBuffer(mime);
            sourceBuffer.addEventListener('updateend', () => {
              isProcessingQueue.current = false;
              processQueue(); 
            });
            sourceBufferRef.current = sourceBuffer;
            processQueue(); 
         } catch (e) {
            console.error("Lỗi addSourceBuffer:", e);
         }
      }
    };
    
    mediaSource.addEventListener('sourceopen', onSourceOpen);
    return () => {
      mediaSource.removeEventListener('sourceopen', onSourceOpen);
    };
  }, [processQueue]); 

  useEffect(() => {
    if (!socket) return;
    
    const handleStartStream = () => {
      setIsListening(true);
      audioQueueRef.current = [];
      isProcessingQueue.current = false;
      if (sourceBufferRef.current && !sourceBufferRef.current.updating && sourceBufferRef.current.buffered.length > 0) {
        try {
          sourceBufferRef.current.remove(0, sourceBufferRef.current.buffered.end(0));
        } catch (e) {
          console.error("Lỗi xóa buffer:", e);
        }
      }
      audioRef.current.play().catch(e => {
        console.log("Trình duyệt chặn tự động play", e);
      });
    };
    
    const handleStopStream = () => {
      setIsListening(false);
      processQueue(); 
    };
    
    // --- (FIX AUDIO LẦN CUỐI) ---
    // Sửa lại hàm này thành async và xử lý Blob/ArrayBuffer
    const handleAudioChunk = async (chunk) => {
      let buffer;
      if (chunk instanceof Blob) {
        buffer = await chunk.arrayBuffer();
      } else if (chunk instanceof ArrayBuffer) {
        buffer = chunk;
      } else {
        console.error("Lỗi: Nhận được mẩu audio không rõ định dạng:", chunk);
        return;
      }
      audioQueueRef.current.push(buffer); 
      processQueue(); 
    };
    
    socket.on('start stream', handleStartStream);
    socket.on('stop stream', handleStopStream);
    socket.on('audio chunk', handleAudioChunk);
    
    return () => {
      socket.off('start stream', handleStartStream);
      socket.off('stop stream', handleStopStream);
      socket.off('audio chunk', handleAudioChunk);
    };
  }, [socket, processQueue]); 

  return (
    <div className="audio-container" style={{ marginBottom: 0 }}>
      <h3 className="audio-title">Audio từ chị Quyên</h3>
      <audio ref={audioRef} controls className="audio-player" autoPlay={true} playsInline={true} />
      {isListening && (
        <p className="status-text listening">● Đang nghe live...</p>
      )}
    </div>
  );
}

// --- Component Chat ---
function ChatBox({ socket, role }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const chatEndRef = useRef(null);
  
  useEffect(() => {
    if (!socket) return;
    socket.on('chat message', (msg) => {
      setMessages((prevMessages) => [...prevMessages, msg]);
    });
    return () => {
      socket.off('chat message');
    };
  }, [socket]);
  
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  const handleSubmit = (e) => {
    e.preventDefault();
    if (newMessage.trim() === '') return;
    const msgPayload = {
      id: `${socket.id}-${Date.now()}`,
      sender: role,
      text: newMessage,
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      isReaction: false, // Tin nhắn thường
    };
    socket.emit('chat message', msgPayload);
    setNewMessage('');
  };
  
  return (
    <div className="chat-box-container">
      <h3 className="chat-box-title">Chat</h3>
      <div className="chat-messages">
        {messages.map((msg) => (
          <div 
            key={msg.id} 
            className={`message-wrapper ${ 
              msg.isReaction ? 'reaction' : (msg.sender === role ? 'sent' : 'received') 
            }`}
          >
            <div className={msg.isReaction ? 'message-reaction-bubble' : 'message-bubble'}>
              {!msg.isReaction && (
                <>
                  <p className="message-sender">{msg.sender === 'teacher' ? 'Chị Quyên' : 'Em Trai'}</p>
                  <p className="message-text">{msg.text}</p>
                  <p className="message-timestamp">{msg.timestamp}</p>
                </>
              )}
              {msg.isReaction && (
                <p className="message-text">{msg.text}</p>
              )}
            </div>
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>
      <form onSubmit={handleSubmit} className="chat-form">
        <input 
          type="text" 
          value={newMessage} 
          onChange={(e) => setNewMessage(e.target.value)} // <<< (FIX 2) SỬA LỖI INPUT
          placeholder="Gõ tin nhắn..." 
          className="chat-input" 
        />
        <button type="submit" className="chat-submit-button">Gửi</button>
      </form>
    </div>
  );
}

// --- Component Công cụ Quiz ---
function QuizTool({ socket, role, currentQuiz }) {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '', '', '']);
  const [selectedAnswer, setSelectedAnswer] = useState(null); 
  
  useEffect(() => {
    if (currentQuiz) {
      setQuestion(currentQuiz.question);
      setOptions(currentQuiz.options);
      setSelectedAnswer(currentQuiz.studentAnswer);
    } else {
      setQuestion('');
      setOptions(['', '', '', '']);
      setSelectedAnswer(null);
    }
  }, [currentQuiz]);
  
  const handleOptionChange = (index, value) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };
  
  const handleCreateQuiz = () => {
    if (question.trim() === '' || options.some(opt => opt.trim() === '')) {
      alert('Cậu phải điền đủ câu hỏi và 4 đáp án nhé!');
      return;
    }
    socket.emit('teacher update quiz', {
      question,
      options,
      studentAnswer: null,
      correctAnswer: null, 
    });
  };
  
  const handleRevealAnswer = (index) => {
    if (!currentQuiz) return;
    socket.emit('teacher update quiz', {
      ...currentQuiz,
      correctAnswer: index, 
    });
  }
  
  const handleCloseQuiz = () => {
    socket.emit('teacher close quiz');
  }
  
  const handleSelectAnswer = (index) => {
    if (!currentQuiz || currentQuiz.correctAnswer !== null) return; // Không cho chọn khi đã công bố
    setSelectedAnswer(index);
    socket.emit('student submit answer', index);
  };
  
  if (role === 'teacher') {
    if (!currentQuiz) {
      return (
        <div className="tool-container">
          <h3 className="tool-title">Tạo Quiz nhanh</h3>
          <label className="tool-label">Câu hỏi:</label>
          <input type="text" className="tool-input" value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Ví dụ: 1 + 1 bằng mấy?" />
          <label className="tool-label">Các đáp án:</label>
          {options.map((opt, index) => (
            <input key={index} type="text" className="tool-input" value={opt} onChange={(e) => handleOptionChange(index, e.target.value)} placeholder={`Đáp án ${String.fromCharCode(65 + index)}`} />
          ))}
          <button className="tool-button" onClick={handleCreateQuiz}>Gửi Quiz</button>
        </div>
      );
    }
    
    // Giao diện khi Quiz đang chạy
    const isRevealed = currentQuiz.correctAnswer !== null;
    const studentAnswer = currentQuiz.studentAnswer;
    return (
      <div className="tool-container">
        <h3 className="tool-title">Quản lý Quiz</h3>
        <p className="quiz-question">{currentQuiz.question}</p>
        <div className="quiz-options">
          {currentQuiz.options.map((option, index) => (
            <div
              key={index}
              className={`quiz-option 
                ${isRevealed && index === currentQuiz.correctAnswer ? 'correct' : ''}
                ${isRevealed && index !== currentQuiz.correctAnswer && index === studentAnswer ? 'wrong' : ''}
                ${!isRevealed && index === studentAnswer ? 'student-answered' : ''}
              `}
            >
              {String.fromCharCode(65 + index)}. {option}
            </div>
          ))}
        </div>
        <p className="quiz-result-info">
          {studentAnswer !== null ? `Em trai đã chọn: ${String.fromCharCode(65 + studentAnswer)}` : 'Em trai chưa trả lời...'}
        </p>
        
        {!isRevealed ? (
          <>
            <label className="tool-label" style={{marginTop: '1rem'}}>Công bố đáp án đúng:</label>
            <div className="quiz-options">
              {currentQuiz.options.map((opt, index) => (
                <button
                  key={index}
                  className="tool-button tertiary" 
                  onClick={() => handleRevealAnswer(index)}
                  style={{marginTop: '0.25rem'}}
                >
                  Chọn {String.fromCharCode(65 + index)} là đúng
                </button>
              ))}
            </div>
          </>
        ) : (
          <p className="quiz-result-info" style={{color: '#16a34a'}}>Đã công bố đáp án!</p>
        )}
        
        <button className="tool-button secondary" onClick={handleCloseQuiz}>Đóng Quiz</button>
      </div>
    );
  }
  
  if (role === 'student') {
    if (!currentQuiz) {
      return (
        <div className="tool-container">
          <h3 className="tool-title">Quiz</h3>
          <p>Chị Quyên chưa gửi câu hỏi nào...</p>
        </div>
      );
    }
    
    const isRevealed = currentQuiz.correctAnswer !== null;
    const myAnswer = selectedAnswer;
    return (
       <div className="tool-container">
        <h3 className="tool-title">Câu hỏi Quiz</h3>
        <p className="quiz-question">{currentQuiz.question}</p>
        <div className="quiz-options">
          {currentQuiz.options.map((option, index) => {
            let className = 'quiz-option';
            if (isRevealed) {
              className += ' disabled';
              if (index === currentQuiz.correctAnswer) className += ' correct';
              else if (index === myAnswer) className += ' wrong';
            } else {
              if (index === myAnswer) className += ' selected';
            }
            return (
              <div
                key={index}
                className={className}
                onClick={() => handleSelectAnswer(index)}
              >
                {String.fromCharCode(65 + index)}. {option}
              </div>
            );
          })}
        </div>
        {isRevealed && (
          <p className="quiz-result-info">
            {myAnswer === currentQuiz.correctAnswer ? "Đúng rồi! Giỏi quá!" : "Sai mất rồi, thử lại sau nhé!"}
          </p>
        )}
      </div>
    );
  }
  
  return null;
}

// --- Component Công cụ YouTube ---
function YouTubeTool({ socket, role, currentYouTubeId }) {
  const [videoIdInput, setVideoIdInput] = useState('');

  const handlePlayVideo = () => {
    let videoId = videoIdInput;
    try {
      const url = new URL(videoIdInput);
      if (url.hostname.includes('youtube.com')) {
        videoId = url.searchParams.get('v');
      } else if (url.hostname.includes('youtu.be')) {
        videoId = url.pathname.substring(1);
      }
    } catch (e) {
      // Bỏ qua nếu không phải URL, giữ nguyên videoIdInput
    }
    
    if (!videoId || videoId.trim() === '') {
      alert("Link hoặc ID YouTube không hợp lệ!");
      return;
    }
    
    socket.emit('teacher play youtube', videoId);
    setVideoIdInput('');
  };

  const handleStopVideo = () => {
    socket.emit('teacher play youtube', null);
  }

  return (
    <div className="tool-container">
      <h3 className="tool-title">Phát YouTube</h3>
      {role === 'teacher' && (
        <>
          <label className="tool-label">Dán link hoặc Video ID vào đây:</label>
          <input 
            type="text" 
            className="tool-input" 
            value={videoIdInput} 
            onChange={(e) => setVideoIdInput(e.target.value)} 
            placeholder="ví dụ: dQw4w9WgXcQ hoặc link YouTube" 
          />
          <button className="tool-button" onClick={handlePlayVideo}>Phát Video</button>
          {currentYouTubeId && (
            <button className="tool-button secondary" onClick={handleStopVideo}>Dừng Video</button>
          )}
        </>
      )}
      
      {currentYouTubeId ? (
        <div className="youtube-player-wrapper">
          <iframe
            src={`https://www.youtube.com/embed/${currentYouTubeId}?autoplay=1`}
            title="YouTube video player"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          ></iframe>
        </div>
      ) : (
        <p style={{marginTop: '1rem'}}>Chưa có video nào được phát...</p>
      )}
    </div>
  );
}