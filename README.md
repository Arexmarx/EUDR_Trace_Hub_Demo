# EUDR TraceHub — S2 Shipment Pack (Academic Prototype)

**Mục đích**: Minh họa một dịch vụ thông tin truy xuất nguồn gốc và hỗ trợ lập hồ sơ thẩm định EUDR theo từng lô cà phê xuất EU, thiết kế cho trường hợp nghiên cứu Simexco DakLak. **Không phải hệ thống của Simexco. Không phải DDS, chứng nhận tuân thủ hoặc kết luận về phá rừng.** Toàn bộ dữ liệu, tọa độ, tên đối tác và kết quả đánh giá được giả lập.

## Chạy demo (không cần npm)

1. Cài Python 3 (hoặc sử dụng Python 3 sẵn có).
2. Trong thư mục `EUDR_TraceHub_Demo`, chạy:

   ```bash
   python -m http.server 8765
   ```

3. Mở <http://localhost:8765/> trong Chrome, Edge hoặc Firefox hiện đại.

**Vì sao cần localhost?** `crypto.subtle.digest` thực hiện băm SHA-256 trong secure context; `localhost` và GitHub Pages (HTTPS) đều hỗ trợ. Không chạy bằng `file://` để đảm bảo các chức năng băm, clipboard và liên kết QR có thể hoạt động ổn định.

## Kiểu chữ giao diện: Roboto

Toàn bộ giao diện web (tiêu đề, menu, bảng, nút bấm, biểu mẫu và tra cứu trên di động) sử dụng **Roboto** qua Google Fonts. `index.html` khai báo font bằng liên kết CDN; `css/style.css` đặt Roboto làm font mặc định. Không cần cài thêm thư viện hoặc font vào project. Để tải đúng Roboto trên một thiết bị chưa cài font, cần có kết nối Internet; khi ngoại tuyến trình duyệt dùng Arial làm font dự phòng. Font của tệp PDF xuất ra vẫn là Helvetica tích hợp sẵn để bảo đảm PDF được tạo không cần Internet.

## Tính năng

- Dashboard quản trị, bốn lô có tình huống đã công bố / sẵn sàng / thiếu thông tin / cảnh báo chờ xác minh.
- Liên kết dữ liệu `mã vườn → phiếu thu mua → lô kho → lô xuất → Shipment Pack`.
- Tự động kiểm tra dữ liệu theo **R1–R7** và hiển thị lỗi cần xử lý.
- Tạo bản nháp (vận hành) → phê duyệt (pháp chế) → công bố (vận hành) → sinh **SHA-256**, phiên bản và QR có thể quét.
- Cổng đối tác EU song ngữ Việt–Anh, tìm mã lô, xem hình học mảnh đất, tải **GeoJSON WGS84**, **PDF tiếng Anh** (tệp PDF thật, định dạng PDF 1.4) và **danh mục bằng chứng giả lập (JSON)**.
- Form yêu cầu bổ sung thông tin (ticket), chuyển vai trò nội bộ để phản hồi, trạng thái ghi trong localStorage.
- Giao diện điện thoại tra cứu mã vườn: lý do chưa đủ dữ liệu và hành động cần thực hiện, không hiển thị dữ liệu cá nhân.
- Bộ dữ liệu cục bộ: **20 vườn, 19 phiếu thu mua, 5 lô kho, 4 lô xuất**. Hình học và tọa độ giả lập; sơ đồ bản đồ không sử dụng dữ liệu nền thực.

## Thử nghiệm nhanh 4 kịch bản

| Mã lô | Kịch bản / kết quả dự kiến |
| --- | --- |
| `LOT-2026-EU-014` | Hồ sơ v1 đã công bố; truy cập cổng EU, tải GeoJSON/PDF, mở QR và ticket |
| `LOT-2026-EU-015` | Đạt 7/7 → Vận hành tạo nháp → chuyển vai trò **Pháp chế** để phê duyệt → chuyển **Vận hành** để công bố → cổng EU truy cập được |
| `LOT-2026-EU-016` | Không đạt R3, R4, R6: vườn `DL-BH-0013` 5,2 ha thiếu polygon; `DL-BH-0014` thiếu bằng chứng đất; chênh 550 kg. Có nút mô phỏng sửa từng lỗi, không thể công bố trước khi đạt kiểm tra và phê duyệt. |
| `LOT-2026-EU-017` | Không đạt R5: hai vườn `DL-KN-0017`, `DL-KN-0018` có cảnh báo cần chuyên trách xác minh, không kết luận vi phạm. |

Chọn **Vai trò** ở góc phải để mô phỏng điểm giao tiếp khác nhau. Để mở bằng QR trên điện thoại khác, máy chủ phải có URL mạng hoặc được triển khai GitHub Pages. Mã QR localhost chỉ mở được trên máy tương ứng.

## Triển khai GitHub Pages

Đưa toàn bộ nội dung thư mục lên thư mục gốc của repository GitHub. Vào Settings → Pages → Deploy from a branch → main / root. Mở đường dẫn HTTPS do GitHub cung cấp. Mã QR sẽ tự dùng URL của bản triển khai hiện tại.

## Giới hạn kỹ thuật và pháp lý

- Chỉ chạy trên trình duyệt, **không có tài khoản thật, cơ sở dữ liệu máy chủ, tích hợp S1, API/tra cứu EU, đối chiếu ảnh vệ tinh, xác minh hồ sơ thật hoặc xác thực pháp chế**.
- Vai trò có thể đổi bằng dropdown để diễn thử; **không bảo vệ dữ liệu thật**. Không nhập tên nông hộ, CCCD hay giấy tờ thật.
- `localStorage` chỉ lưu trên trình duyệt đang dùng; không đồng bộ máy khác. Có thể reset trong màn hình yêu cầu hỗ trợ.
- Băm SHA-256 chứng minh tính nhất quán của snapshot dữ liệu lưu trong trình duyệt, **không phải chữ ký số**, không chống sửa dữ liệu từ người có quyền truy cập vào trình duyệt.
- Quy tắc R1–R7 là các quy tắc **kiểm soát dữ liệu do nhóm thiết kế**, không đồng nghĩa một quy trình thẩm định đầy đủ theo EUDR.
- GeoJSON và PDF chỉ chứa dữ liệu giả lập. PDF hiển thị tiếng Anh/ASCII để tương thích trình đọc phổ thông mà không cần tải font từ Internet.
- SLA 99,5%, 24 giờ hỗ trợ, RTO 8 giờ và RPO 24 giờ trong báo cáo là **đề xuất cho hệ thống tương lai**, không phải hiệu năng đã được xác minh của prototype.

## Cấu trúc mã nguồn

```
index.html             Giao diện HTML, menu và các SVG icons
css/style.css          Design system minimalist, responsive
js/data.js             Bộ dữ liệu giả lập (20/19/5/4)
js/app.js              Giao diện, quy tắc R1–R7, workflow và ticket
js/pdf.js              Tự tạo tệp PDF 1.4 không phụ thuộc Internet
js/vendor/qrcode-bundle.js   Bộ tạo QR cục bộ dựa trên mã nguồn MIT của Kazuhiko Arase
tests/test_demo.py      Kịch bản kiểm thử tự động bằng Playwright Python
screenshots/            Ảnh kiểm thử phục vụ Chương IV
```

## Bảo quyền sử dụng nguồn

Bộ sinh mã QR: Kazuhiko Arase, QR Code for JavaScript (MIT License), được đóng gói lại từ bản sử dụng trong dự án `qrcode-terminal`. Các mã khác được tạo riêng cho bài demo này.
"# EUDR_Trace_Hub_Demo" 
