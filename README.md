# Dự án Shadowing (Học Tiếng Anh qua Video YouTube)

## 1. Tổng quan tất cả các tính năng
- Tải phụ đề (transcript) từ bất kỳ video YouTube nào (hỗ trợ mọi ngôn ngữ phụ đề).
- Trình phát video tích hợp đồng bộ tự động với từng câu phụ đề.
- Chức năng **Auto-pause**: Tự động dừng ở cuối mỗi câu (dừng sớm 0.15s để tránh lem âm thanh sang câu kế tiếp).
- Lặp lại câu hiện tại, lùi về câu trước, tiến tới câu sau.
- Phím tắt tiện lợi: `Space` (Play/Pause), `R` hoặc `Tab` (Replay), `Arrow Left/Right` (Prev/Next).
- Tự động lấy và hiển thị phiên âm IPA cho từ vựng trong câu.
- Tab **Discover**: Tìm kiếm và gợi ý các kênh video hữu ích theo trình độ (IELTS 4.5 - 7.0+).
- Tab **Archives**: Lưu trữ lại lịch sử video đã học.
- Thuật toán **Spaced Repetition (Lặp lại ngắt quãng)**: Tính toán thời gian ôn tập lại dựa trên chất lượng học.
- Ghi nhớ tiến trình học: Lưu lại chính xác thời điểm giây cuối cùng (`Stopped at: MM:SS.ms`) cũng như tổng phần trăm hoàn thành của video.

## 2. Kiến trúc hệ thống
- **Framework**: Next.js (App Router).
- **Frontend**: React.js, thiết kế giao diện Glassmorphism với CSS Modules.
- **Backend (API Routes)**:
  - `/api/transcript`: Lấy phụ đề từ YouTube qua thư viện `youtube-transcript`.
  - `/api/search`: Tìm kiếm video YouTube qua thư viện `yt-search`.
  - `/api/phonetics`: Gọi bên thứ 3 để lấy phiên âm (IPA) cho từng từ.
- **Data Storage**: Tạm thời dùng LocalStorage để lưu trữ ở phía client (Lịch sử học `shadowing_urls`, tiến trình `shadowing_progress_...`, `shadowing_time_...`, `shadowing_duration_...`).
- **Deployment**: Vercel (sử dụng Node.js runtime cho các API vì có dùng node modules).

## 3. Các component
*(Hiện tại phần lớn logic frontend nằm gọn trong file `page.js`)*
- **`src/app/page.js`**: Component chính, bao gồm:
  - **Sidebar**: Điều hướng giữa Workspace, Discover, Archives.
  - **Workspace Panel**: Trình phát video (`react-youtube`), Form nhập URL, Bảng phiên âm, Thanh điều khiển.
  - **Transcript Sequence**: Danh sách các câu phụ đề, Trạng thái tiến trình.
  - **Discover**: Thanh tìm kiếm, Danh sách gợi ý, Kết quả tìm kiếm.
  - **Archives**: Danh sách lưu trữ thẻ video đã học, tiến trình và lịch ôn tập.
- **`src/app/page.module.css`**: CSS Modules định dạng giao diện cho toàn bộ app.
- **`src/app/api/transcript/route.js`**: Route xử lý lấy và ghép các đoạn phụ đề thành câu hoàn chỉnh.
- **`src/app/api/search/route.js`**: Route proxy cho tìm kiếm video.
- **`src/app/api/phonetics/route.js`**: Route proxy lấy phiên âm.

## 4. Các task đã làm
- Khởi tạo Next.js App, UI Glassmorphism đẹp mắt.
- Tích hợp thành công `react-youtube` và `youtube-transcript`.
- Tối ưu hóa tính năng **Auto-pause**: Sửa lỗi dừng chậm/sớm, loại bỏ lỗi loop treo video.
- Sửa các lỗi UI: Tràn chữ ở `phoneticsBox`.
- Khắc phục lỗi Cache API tĩnh trên Vercel (`force-dynamic`).
- Khắc phục lỗi crash Server Local khi dùng Edge Runtime.
- Hoàn thiện tính năng lưu lịch sử, ghi nhận tiến trình xem chi tiết tới từng giây (`Stopped at`).
- Tích hợp cơ bản thuật toán ôn tập Spaced Repetition.
- Refactor (tách) `src/app/page.js` ra thành các file Component con riêng biệt (`Sidebar`, `PlayerPanel`, `TranscriptSequence`, `Discover`, `Archives`) để tối ưu mã nguồn.

## 5. Các task chưa làm
- Chuyển đổi dữ liệu sang dùng Database (Supabase / Firebase / MongoDB) thay vì LocalStorage để lưu trữ đa thiết bị.
- Xử lý cache/database cho Transcript để không phải gọi API YouTube liên tục làm chậm hoặc bị rate limit.

---

## 6. Update Logs
*(Quy định bắt buộc: Mọi update đều phải ghi log vào file này)*

- **[2026-07-10]**: Refactor `src/app/page.js` thành các components độc lập (`Sidebar`, `Discover`, `Archives`, `Workspace/PlayerPanel`, `Workspace/TranscriptSequence`) để mã nguồn sạch và dễ quản lý hơn. Bỏ task "Ghi âm" theo yêu cầu.
- **[2026-07-10]**: Tạo file README ghi rõ tổng quan, kiến trúc, component và task.
- **[2026-07-10]**: Cập nhật tính năng Saved Archives: hiển thị tiến trình phần trăm và mốc thời gian lưu (Stopped at).
- **[2026-07-09]**: Sửa lỗi giao diện tràn chữ trong bảng phiên âm (`phoneticsBox` - `flex-shrink`). Sửa lỗi API Cache Vercel và lỗi Local Edge Runtime. Thêm Replay shortcut và tinh chỉnh Auto-pause.
