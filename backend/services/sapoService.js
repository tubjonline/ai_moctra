const axios = require('axios');

async function searchProducts(query) {
  try {
    const STORE_URL = process.env.SAPO_STORE_URL;
    const API_KEY = process.env.SAPO_API_KEY;
    const API_SECRET = process.env.SAPO_API_SECRET;

    if (!STORE_URL || !API_KEY || !API_SECRET) {
      console.warn("Sapo credentials missing. Returning empty array.");
      return [];
    }

    // Basic auth cho Sapo
    const auth = {
      username: API_KEY,
      password: API_SECRET
    };

    const url = `https://${STORE_URL}/admin/products.json`;
    const response = await axios.get(url, { 
      auth,
      params: {
        query: query,
        limit: 5 // Lấy 5 kết quả tốt nhất
      }
    });

    const products = response.data.products || [];
    
    // Map data sang format chuẩn cho Carousel và trả về chi tiết tồn kho các size
    return products.map(p => {
      // Tìm hình đại diện
      const image = p.images && p.images.length > 0 ? p.images[0].src : 'https://via.placeholder.com/300x400?text=No+Image';
      
      // Lấy giá của phiên bản đầu tiên
      const price = p.variants && p.variants.length > 0 ? p.variants[0].price : 0;
      
      // Lấy danh sách các size còn tồn kho từ variants
      const availableSizes = [];
      if (p.variants) {
        p.variants.forEach(v => {
          if (v.inventory_quantity > 0) {
            // Sapo thường lưu size ở title (ví dụ "Đỏ / M") hoặc trong mảng options
            // Giả định đơn giản: lấy title của variant (ví dụ: "Size S", "M", "L")
            availableSizes.push(v.title || v.name || 'Mặc định');
          }
        });
      }

      return {
        id: p.id,
        name: p.name,
        price: price,
        inStock: p.variants ? p.variants.some(v => v.inventory_quantity > 0) : true,
        availableSizes: availableSizes,
        image: image
      };
    });
  } catch (error) {
    console.error("Sapo API Error:", error.response ? error.response.data : error.message);
    // Nếu có lỗi (ví dụ token hết hạn hoặc API chưa mở đúng quyền), tạm trả về rỗng để Gemini không crash
    return [];
  }
}

module.exports = {
  searchProducts
};
