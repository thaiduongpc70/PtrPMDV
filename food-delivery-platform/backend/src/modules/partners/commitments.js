/*
 * Nội dung "Bản cam kết" hiển thị trước khi đăng ký (nhà hàng / tài xế).
 * Cấu trúc tham khảo mẫu cam kết an toàn thực phẩm của cơ sở ăn uống (hoatieu.vn, accgroup.vn, luatvietnam.vn)
 * và điều khoản hợp tác của các nền tảng giao đồ ăn; viết lại theo nghiệp vụ FoodGo.
 * Khi sửa nội dung: tăng COMMITMENT_VERSION để hồ sơ đăng ký ghi nhận đúng phiên bản đã đồng ý.
 * Chuỗi {{email}} / {{hotline}} được giao diện thay bằng thông tin liên hệ lấy từ DB.
 */
export const COMMITMENT_VERSION = '1.0-2026-11-08';

const LEGAL_COMMON = [
  'Bộ luật Dân sự 2015 (Luật số 91/2015/QH13).',
  'Luật Giao dịch điện tử 2023 (Luật số 20/2023/QH15) và Nghị định 52/2013/NĐ-CP về thương mại điện tử (sửa đổi, bổ sung bởi Nghị định 85/2021/NĐ-CP).',
  'Luật Bảo vệ quyền lợi người tiêu dùng 2023 (Luật số 19/2023/QH15).',
  'Nghị định 13/2023/NĐ-CP về bảo vệ dữ liệu cá nhân.'
];

export const COMMITMENTS = {
  restaurant: {
    title: 'Bản cam kết hợp tác dành cho Nhà hàng đối tác',
    intro: 'Bản cam kết này là một phần của thoả thuận hợp tác giữa FoodGo (sau đây gọi là “Nền tảng”) và chủ nhà hàng đăng ký bán hàng trên Nền tảng (sau đây gọi là “Đối tác”). Đối tác vui lòng đọc kỹ toàn bộ nội dung, kéo xuống cuối trang rồi mới có thể xác nhận đồng ý.',
    sections: [
      { title: 'Điều 1. Căn cứ pháp lý', items: [
        'Luật An toàn thực phẩm 2010 (Luật số 55/2010/QH12) và Nghị định 15/2018/NĐ-CP hướng dẫn thi hành.',
        'Luật Thương mại 2005 và Nghị định 81/2018/NĐ-CP về hoạt động xúc tiến thương mại (khuyến mại).',
        ...LEGAL_COMMON
      ] },
      { title: 'Điều 2. Tư cách pháp lý và thông tin đăng ký', items: [
        'Đối tác là cá nhân, hộ kinh doanh hoặc doanh nghiệp được phép kinh doanh dịch vụ ăn uống tại địa điểm đã đăng ký (hoặc đang hoàn tất thủ tục theo quy định) và chịu trách nhiệm về tính hợp pháp của hoạt động kinh doanh đó.',
        'Toàn bộ thông tin khai trong hồ sơ (tên quán, địa chỉ, giờ mở cửa, người đại diện, số điện thoại, email, mã số hộ kinh doanh/giấy phép kinh doanh) là chính xác, trung thực; khi có thay đổi Đối tác cập nhật ngay trên cổng quản lý.',
        'Mỗi tài khoản chỉ do Đối tác hoặc người được Đối tác uỷ quyền sử dụng; không cho mượn, cho thuê hoặc chuyển nhượng tài khoản. Đối tác tự bảo mật mật khẩu và chịu trách nhiệm về mọi thao tác thực hiện bằng tài khoản của mình.',
        'Nền tảng có quyền yêu cầu xuất trình giấy tờ để xác minh, tạm từ chối duyệt hoặc tạm khoá quán nếu thông tin không đúng, không đủ hoặc không thể xác minh.'
      ] },
      { title: 'Điều 3. Cam kết an toàn thực phẩm', items: [
        'Cơ sở đáp ứng điều kiện bảo đảm an toàn thực phẩm đối với cơ sở dịch vụ ăn uống theo Luật An toàn thực phẩm và Nghị định 15/2018/NĐ-CP; có Giấy chứng nhận cơ sở đủ điều kiện an toàn thực phẩm hoặc Bản cam kết bảo đảm an toàn thực phẩm (đối với cơ sở thuộc diện phải thực hiện) và xuất trình khi cơ quan chức năng hoặc Nền tảng yêu cầu.',
        'Nguyên liệu, thực phẩm, phụ gia, nước đá, nước uống dùng chế biến đều có nguồn gốc rõ ràng, còn hạn sử dụng, được bảo quản đúng cách. Tuyệt đối không sử dụng chất cấm, phụ gia ngoài danh mục cho phép, thực phẩm hết hạn, ôi thiu, nhiễm bẩn hoặc không rõ nguồn gốc.',
        'Khu bếp, dụng cụ chế biến và đóng gói luôn sạch sẽ; tách riêng thực phẩm sống và chín; xử lý rác thải, nước thải đúng quy định.',
        'Người trực tiếp chế biến, đóng gói có sức khoẻ phù hợp, không mắc bệnh truyền nhiễm qua đường thực phẩm, mặc trang phục gọn gàng và giữ vệ sinh cá nhân (rửa tay, đội mũ/khẩu trang khi cần).',
        'Khi khách hỏi hoặc ghi chú về dị ứng (đậu phộng, hải sản, sữa, trứng, gluten…), Đối tác cung cấp thông tin trung thực về thành phần món ăn và không cam kết sai về việc “không chứa” thành phần đó.',
        'Khi nhận được phản ánh về ngộ độc hoặc mất an toàn thực phẩm, Đối tác lập tức ngừng bán món liên quan, thông báo cho Nền tảng, hợp tác cung cấp thông tin, hồ sơ nguyên liệu và chịu trách nhiệm theo quy định của pháp luật.'
      ] },
      { title: 'Điều 4. Thực đơn, giá bán và hình ảnh', items: [
        'Tên món, mô tả, thành phần, kích cỡ, nhóm tuỳ chọn/topping và combo được đăng đúng với thực tế. Món trong combo phải đủ thành phần, số lượng như đã mô tả.',
        'Giá do Đối tác tự quyết định, được niêm yết rõ ràng trên Nền tảng và không thay đổi sau khi khách đã đặt đơn. Đối tác không tự ý thu thêm khoản nào ngoài giá đã niêm yết và các khoản phí hiển thị trong đơn hàng.',
        'Hình ảnh là ảnh thật của món do Đối tác chụp hoặc Đối tác có quyền sử dụng hợp pháp; Đối tác chịu trách nhiệm trước bên thứ ba về bản quyền hình ảnh, thương hiệu và nội dung mình đăng tải.',
        'Cập nhật kịp thời trạng thái hết món, tạm ngừng bán, giờ mở/đóng cửa. Không nhận đơn khi không thể phục vụ.'
      ] },
      { title: 'Điều 5. Tiếp nhận và chuẩn bị đơn hàng', items: [
        'Xác nhận hoặc từ chối đơn trong thời gian hợp lý kể từ khi đơn được tạo. Đơn đã xác nhận không được tự ý huỷ, trừ trường hợp bất khả kháng (hết nguyên liệu đột xuất, sự cố bếp…) và phải thông báo ngay cho khách hàng và Nền tảng.',
        'Chuẩn bị món đúng thời gian chuẩn bị hiển thị; khi dự kiến trễ phải cập nhật trạng thái hoặc báo cho Nền tảng để thông báo cho khách và tài xế.',
        'Thực hiện đúng ghi chú của khách (ít đường, không hành, lấy dụng cụ ăn uống hay không, giao không tiếp xúc…) và ghi chú dành cho tài xế.',
        'Không yêu cầu khách thanh toán hoặc giao dịch ngoài Nền tảng nhằm tránh phí hoặc hưởng khuyến mãi không đúng quy định.'
      ] },
      { title: 'Điều 6. Đóng gói và bàn giao cho tài xế', items: [
        'Dùng bao bì sạch, an toàn cho thực phẩm, đóng kín, chống đổ tràn; tách phần nước/canh, đồ nóng/đồ lạnh khi cần; có niêm phong hoặc cách đóng gói thể hiện món chưa bị mở.',
        'Đối chiếu mã đơn, tên khách, số lượng và ghi chú trước khi giao cho tài xế; chỉ bàn giao cho tài xế được Nền tảng phân công cho đơn đó.',
        'Món thiếu, sai, hư hỏng hoặc không đạt chất lượng do lỗi của Đối tác thì Đối tác chịu trách nhiệm hoàn tiền/bồi hoàn theo chính sách của Nền tảng và quy định pháp luật.'
      ] },
      { title: 'Điều 7. Khuyến mãi của quán', items: [
        'Voucher của quán do Đối tác tự phát hành và tự chịu chi phí giảm giá; điều kiện áp dụng (đơn tối thiểu, mức giảm tối đa, hạn ngạch, thời hạn, số lượt/khách) phải rõ ràng và không gây hiểu nhầm.',
        'Không thay đổi điều kiện hoặc thu hồi voucher đã phát hành theo cách gây thiệt hại cho khách đang đủ điều kiện sử dụng. Việc gia hạn voucher thực hiện trên cổng quản lý trong giới hạn Nền tảng cho phép.',
        'Nền tảng có quyền điều chỉnh hoặc khoá chương trình có dấu hiệu lạm dụng, gian lận hoặc vi phạm quy định về khuyến mại.'
      ] },
      { title: 'Điều 8. Doanh thu, hoa hồng, đối soát và thuế', items: [
        'Hoa hồng của Nền tảng được tính theo mức đã thoả thuận khi duyệt hồ sơ và hiển thị trên cổng quản lý của Đối tác. Mọi điều chỉnh mức hoa hồng (nếu có) được thông báo trước khi áp dụng.',
        'Doanh thu ghi nhận theo các đơn đã giao thành công. Khoản đối soát = doanh thu món ăn − hoa hồng − tiền hoàn cho khách − phần khuyến mãi do quán tài trợ ± điều chỉnh (nếu có). Đối soát lập theo kỳ do Nền tảng công bố; Đối tác kiểm tra và phản hồi sai lệch trong thời hạn khiếu nại ghi trên bản đối soát.',
        'Tiền khách thanh toán khi nhận hàng (COD) do tài xế thu và được Nền tảng đối soát; Đối tác không đòi tiền trực tiếp từ khách hoặc tài xế đối với đơn đã được thanh toán qua Nền tảng.',
        'Đối tác tự chịu trách nhiệm kê khai và nộp các loại thuế, phí phát sinh từ hoạt động kinh doanh của mình; Nền tảng khấu trừ hoặc kê khai thay trong phạm vi pháp luật yêu cầu.'
      ] },
      { title: 'Điều 9. Bảo vệ dữ liệu cá nhân của khách hàng', items: [
        'Họ tên, số điện thoại, địa chỉ của khách chỉ được dùng để chuẩn bị và giao đơn hàng; không sao chép, lưu trữ ngoài mục đích đó, không chia sẻ, mua bán hoặc dùng để quảng cáo, liên hệ ngoài đơn hàng.',
        'Tuân thủ Nghị định 13/2023/NĐ-CP; có biện pháp bảo vệ thông tin trong hệ thống và nhân sự của mình; thông báo ngay cho Nền tảng khi phát hiện lộ lọt dữ liệu.',
        'Không tiết lộ thông tin kinh doanh, dữ liệu vận hành của Nền tảng mà Đối tác biết được trong quá trình hợp tác.'
      ] },
      { title: 'Điều 10. Đánh giá, khiếu nại và hỗ trợ khách hàng', items: [
        'Không tự tạo, mua bán hoặc thuê đánh giá ảo; không gây áp lực, đe doạ hoặc đề nghị lợi ích để khách sửa/xoá đánh giá. Phản hồi đánh giá lịch sự, trung thực.',
        'Hợp tác giải quyết khiếu nại của khách trong thời gian hợp lý, cung cấp thông tin và bằng chứng khi Nền tảng yêu cầu, và chấp nhận phương án hoàn tiền hợp lý của Nền tảng nếu lỗi thuộc về quán.'
      ] },
      { title: 'Điều 11. Hành vi bị nghiêm cấm', items: [
        'Kinh doanh hàng hoá, dịch vụ bị cấm hoặc hạn chế kinh doanh theo pháp luật; đăng nội dung phản cảm, sai sự thật, xâm phạm quyền của người khác.',
        'Tạo đơn ảo, tự đặt đơn hoặc kết hợp với người khác để hưởng khuyến mãi, tăng xếp hạng, doanh số; can thiệp trái phép vào hệ thống, dữ liệu, thao tác đối soát.',
        'Phân biệt đối xử, xúc phạm khách hàng hoặc tài xế; giữ lại hoặc từ chối giao món đã được thanh toán mà không có lý do chính đáng.'
      ] },
      { title: 'Điều 12. Xử lý vi phạm', items: [
        'Tuỳ mức độ, Nền tảng có thể áp dụng lần lượt: nhắc nhở; hạn chế hiển thị; tạm ngừng nhận đơn; khoá tài khoản và chấm dứt hợp tác; đồng thời giữ lại khoản đối soát tương ứng để xử lý hoàn tiền cho khách.',
        'Đối tác bồi thường thiệt hại thực tế phát sinh do vi phạm cam kết và chịu trách nhiệm trước cơ quan có thẩm quyền về các vi phạm thuộc phạm vi trách nhiệm của mình.'
      ] },
      { title: 'Điều 13. Hiệu lực, sửa đổi và chấm dứt', items: [
        'Cam kết có hiệu lực kể từ khi hồ sơ của Đối tác được duyệt và kéo dài đến khi hợp tác chấm dứt. Thời điểm và phiên bản cam kết Đối tác đã đồng ý được hệ thống ghi nhận cùng hồ sơ đăng ký.',
        'Nền tảng có thể cập nhật nội dung cam kết cho phù hợp quy định pháp luật và vận hành; bản cập nhật được thông báo cho Đối tác. Việc tiếp tục sử dụng Nền tảng sau thời điểm có hiệu lực của bản cập nhật được hiểu là chấp thuận.',
        'Đối tác có thể chấm dứt hợp tác bằng cách thông báo cho Nền tảng, sau khi hoàn tất các đơn đang xử lý và đối soát còn tồn. Các nghĩa vụ về an toàn thực phẩm, bảo mật dữ liệu và đối soát vẫn còn hiệu lực sau khi chấm dứt.'
      ] },
      { title: 'Điều 14. Luật áp dụng và giải quyết tranh chấp', items: [
        'Cam kết được điều chỉnh bởi pháp luật Việt Nam. Tranh chấp phát sinh được ưu tiên giải quyết bằng thương lượng, hoà giải; nếu không thành, các bên đưa ra Toà án có thẩm quyền theo quy định pháp luật.'
      ] }
    ],
    closing: 'Bằng việc bấm “Tôi đã đọc và đồng ý”, tôi xác nhận đã đọc toàn bộ bản cam kết này, hiểu rõ quyền – nghĩa vụ của mình, cam kết thông tin khai là đúng sự thật và tự nguyện thực hiện. Mọi thắc mắc xin liên hệ {{email}}{{hotline}}.'
  },

  shipper: {
    title: 'Bản cam kết dành cho Tài xế đối tác',
    intro: 'Bản cam kết này quy định quyền và nghĩa vụ giữa FoodGo (“Nền tảng”) và cá nhân đăng ký làm tài xế giao hàng (“Tài xế”). Tài xế là đối tác độc lập, tự chủ thời gian làm việc, không phải người lao động của Nền tảng. Vui lòng đọc hết nội dung và kéo xuống cuối trang để xác nhận.',
    sections: [
      { title: 'Điều 1. Căn cứ pháp lý', items: [
        'Luật Trật tự, an toàn giao thông đường bộ 2024 (Luật số 36/2024/QH15) và các quy định về điều kiện tham gia giao thông.',
        'Nghị định 67/2023/NĐ-CP về bảo hiểm bắt buộc trách nhiệm dân sự của chủ xe cơ giới.',
        'Luật An toàn thực phẩm 2010 (Luật số 55/2010/QH12) về vận chuyển, giao nhận thực phẩm.',
        ...LEGAL_COMMON
      ] },
      { title: 'Điều 2. Điều kiện và thông tin đăng ký', items: [
        'Tài xế đủ tuổi theo quy định, có năng lực hành vi dân sự đầy đủ, sức khoẻ phù hợp để giao hàng; không đang bị cấm hành nghề hoặc truy cứu trách nhiệm hình sự liên quan đến hành vi xâm phạm tài sản, trật tự công cộng.',
        'Thông tin cá nhân (họ tên, số CCCD/CMND, số điện thoại, email) và giấy tờ phương tiện (biển số, giấy phép lái xe còn hiệu lực phù hợp loại xe) là chính xác. Tài xế dùng xe đạp không cần cung cấp biển số và giấy phép lái xe.',
        'Mỗi tài khoản chỉ do chính Tài xế sử dụng; không cho người khác dùng chung, thuê hoặc nhận đơn hộ. Mọi hành vi trên tài khoản do Tài xế chịu trách nhiệm.',
        'Nền tảng có quyền xác minh giấy tờ, đối chiếu thông tin và từ chối hoặc tạm khoá tài khoản khi thông tin sai lệch hoặc giấy tờ hết hiệu lực.'
      ] },
      { title: 'Điều 3. Phương tiện và an toàn giao thông', items: [
        'Phương tiện thuộc quyền sử dụng hợp pháp của Tài xế, bảo dưỡng tốt, có đủ giấy tờ theo quy định, có bảo hiểm trách nhiệm dân sự bắt buộc còn hiệu lực (đối với xe cơ giới); khuyến khích mua thêm bảo hiểm tai nạn cho bản thân.',
        'Tuân thủ nghiêm luật giao thông: đội mũ bảo hiểm đạt chuẩn, không uống rượu bia hoặc dùng chất kích thích khi nhận và giao đơn, không sử dụng điện thoại cầm tay khi đang điều khiển phương tiện, không chạy quá tốc độ, không đi ngược chiều hay vượt đèn đỏ để kịp giờ.',
        'Tài xế tự chịu trách nhiệm về an toàn của bản thân và phương tiện; mọi vi phạm hành chính, tai nạn hoặc thiệt hại phát sinh do lỗi của Tài xế khi tham gia giao thông do Tài xế tự chịu theo quy định pháp luật.'
      ] },
      { title: 'Điều 4. Nhận và thực hiện đơn giao hàng', items: [
        'Chỉ nhận đơn khi sẵn sàng và có thể giao; không nhận rồi tự ý bỏ đơn. Trường hợp bất khả kháng phải báo ngay cho Nền tảng để chuyển đơn cho tài xế khác.',
        'Đến quán đúng hẹn, kiểm tra đúng mã đơn, đúng số lượng món, đúng người nhận trước khi rời quán; từ chối nhận hàng nếu bao bì mở, rách, có dấu hiệu hư hỏng hoặc không đúng đơn và báo cho Nền tảng.',
        'Cập nhật trạng thái đơn (đã lấy hàng, đang giao, đã giao/thất bại) đúng thời điểm thực tế. Không bấm “đã giao” khi chưa bàn giao hàng cho khách.',
        'Bật định vị GPS thật của thiết bị trong suốt thời gian thực hiện đơn để Nền tảng và khách theo dõi. Nghiêm cấm dùng phần mềm giả lập vị trí hoặc can thiệp dữ liệu định vị.',
        'Thực hiện đúng ghi chú giao hàng của khách (giao không tiếp xúc, để ở cổng, gọi trước khi đến…), giữ thái độ lịch sự, hỗ trợ khách trong khả năng cho phép.'
      ] },
      { title: 'Điều 5. Vệ sinh và bảo quản thực phẩm khi vận chuyển', items: [
        'Dùng thùng/túi giữ nhiệt sạch, khô, chỉ chứa thực phẩm; không chở lẫn hoá chất, hàng có mùi hoặc vật dụng gây ô nhiễm; giữ đồ uống, món canh thẳng đứng, tránh đổ tràn.',
        'Không tự ý mở niêm phong, ăn uống, thay thế, đánh tráo hoặc làm hư hại món hàng. Giữ vệ sinh cá nhân và dụng cụ vận chuyển.',
        'Giao hàng trong thời gian hợp lý để bảo đảm chất lượng món; khi dự kiến trễ phải chủ động thông báo cho khách và Nền tảng.'
      ] },
      { title: 'Điều 6. Thu hộ tiền (COD) và đối soát', items: [
        'Với đơn thanh toán khi nhận hàng, Tài xế thu đúng số tiền hiển thị trong đơn, không thu thêm hoặc bớt, trừ khoản tiền boa khách tự nguyện cho. Tài xế xác nhận số tiền đã thu trên ứng dụng ngay sau khi giao.',
        'Tiền thu hộ là tiền của Nền tảng và Đối tác, không phải thu nhập của Tài xế. Tài xế nộp/đối soát đầy đủ, đúng hạn theo hướng dẫn và kỳ đối soát hiển thị trong ứng dụng; tuyệt đối không giữ, chiếm dụng, sử dụng vào mục đích khác.',
        'Trường hợp khách không nhận hàng hoặc giao thất bại, Tài xế báo ngay cho Nền tảng, giữ nguyên hiện trạng món hàng và làm theo hướng dẫn xử lý; không tự ý bán, ăn hoặc cho người khác.',
        'Hành vi chiếm đoạt tiền thu hộ hoặc hàng hoá có thể bị xử lý theo pháp luật, ngoài việc bị khoá tài khoản và truy thu số tiền liên quan.'
      ] },
      { title: 'Điều 7. Thu nhập, thuế và yêu cầu rút tiền', items: [
        'Thu nhập của Tài xế gồm phí giao hàng theo từng đơn thành công và các khoản thưởng (nếu có) theo chính sách hiển thị trong ứng dụng; được tính theo dữ liệu đơn hàng và quãng đường thực tế ghi nhận trên hệ thống.',
        'Tài xế gửi yêu cầu rút tiền trong ứng dụng; yêu cầu được xử lý sau khi Nền tảng kiểm tra đối soát COD và các khoản phải trừ (nếu có).',
        'Tài xế tự chịu trách nhiệm kê khai và nộp thuế đối với thu nhập của mình theo quy định pháp luật; Nền tảng khấu trừ hoặc kê khai thay trong phạm vi pháp luật yêu cầu.'
      ] },
      { title: 'Điều 8. Bảo vệ dữ liệu cá nhân của khách và quán', items: [
        'Số điện thoại, họ tên, địa chỉ của khách chỉ dùng để liên hệ và giao đơn đó; không lưu trữ, sao chép, chia sẻ, đăng tải hoặc dùng để liên hệ ngoài đơn hàng.',
        'Không chụp ảnh khách, nhà khách hoặc đăng lên mạng xã hội khi chưa được đồng ý. Tuân thủ Nghị định 13/2023/NĐ-CP và thông báo ngay cho Nền tảng nếu lộ lọt thông tin.'
      ] },
      { title: 'Điều 9. Thái độ, ứng xử và hành vi bị cấm', items: [
        'Giao tiếp lịch sự, không phân biệt đối xử, không quấy rối, đe doạ, xúc phạm khách hàng, nhân viên quán hay tài xế khác.',
        'Nghiêm cấm: nhận đơn ảo hoặc thông đồng với quán/khách để hưởng khuyến mãi, thu nhập; giả mạo giấy tờ, danh tính; giao hàng cấm; tuyển dụng/lôi kéo khách sang giao dịch ngoài Nền tảng; can thiệp trái phép vào hệ thống.'
      ] },
      { title: 'Điều 10. Sự cố, khiếu nại và trách nhiệm', items: [
        'Khi xảy ra tai nạn, mất hàng, đơn bị khiếu nại hoặc sự cố khác, Tài xế báo ngay cho Nền tảng, bảo vệ hiện trường và cung cấp thông tin, hình ảnh, bằng chứng cần thiết.',
        'Nếu hàng hoá hư hỏng, thất lạc hoặc giao sai do lỗi của Tài xế, Tài xế chịu trách nhiệm bồi hoàn tương ứng theo chính sách của Nền tảng và quy định pháp luật.'
      ] },
      { title: 'Điều 11. Xử lý vi phạm', items: [
        'Tuỳ mức độ, Nền tảng có thể: nhắc nhở; giảm ưu tiên nhận đơn; tạm khoá nhận đơn; khoá tài khoản và chấm dứt hợp tác; khấu trừ vào thu nhập các khoản bồi hoàn; chuyển cơ quan chức năng khi có dấu hiệu vi phạm pháp luật.'
      ] },
      { title: 'Điều 12. Hiệu lực, sửa đổi và chấm dứt', items: [
        'Cam kết có hiệu lực từ khi hồ sơ được duyệt. Thời điểm và phiên bản cam kết Tài xế đã đồng ý được hệ thống ghi nhận cùng hồ sơ đăng ký.',
        'Nền tảng có thể cập nhật cam kết và thông báo cho Tài xế; việc tiếp tục nhận đơn sau thời điểm có hiệu lực được hiểu là chấp thuận bản cập nhật.',
        'Tài xế có thể ngừng hợp tác bất cứ lúc nào bằng cách thông báo cho Nền tảng, sau khi hoàn tất các đơn đang giao và nộp đối soát COD còn tồn.',
        'Cam kết chịu sự điều chỉnh của pháp luật Việt Nam; tranh chấp được giải quyết bằng thương lượng, nếu không thành thì đưa ra Toà án có thẩm quyền.'
      ] }
    ],
    closing: 'Bằng việc bấm “Tôi đã đọc và đồng ý”, tôi xác nhận đã đọc toàn bộ bản cam kết, thông tin khai là đúng sự thật và tôi tự nguyện tuân thủ. Mọi thắc mắc xin liên hệ {{email}}{{hotline}}.'
  }
};

/** Kiểm tra bằng chứng đồng ý gửi kèm hồ sơ đối tác; trả về bản ghi lưu vào payload (thời điểm do máy chủ ghi). */
export function readCommitment(value, kind) {
  if (!COMMITMENTS[kind]) throw new Error(`Unknown commitment kind: ${kind}`);
  const ok = value && value.accepted === true && value.readToEnd === true && value.version === COMMITMENT_VERSION && value.kind === kind;
  return ok ? { kind, version: COMMITMENT_VERSION, readToEnd: true, acceptedAt: new Date().toISOString() } : null;
}
