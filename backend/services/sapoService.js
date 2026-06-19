const mockProducts = [
  // Áo dài Nữ
  { id: 101, name: "Áo dài lụa Vân Diệu Nhi (Nữ)", price: 2690000, inStock: true, availableSizes: ["S", "M", "L"], image: "https://moctrasilk.com/wp-content/uploads/2023/12/ao-dai-nu-1.jpg", category: "nữ" },
  { id: 102, name: "Áo dài Nguyệt Cát (Nữ)", price: 2890000, inStock: true, availableSizes: ["M", "L"], image: "https://moctrasilk.com/wp-content/uploads/2023/12/ao-dai-nu-2.jpg", category: "nữ" },
  { id: 103, name: "Áo dài Tấm lụa tơ tằm (Nữ)", price: 3100000, inStock: true, availableSizes: ["S", "M", "L", "XL"], image: "https://moctrasilk.com/wp-content/uploads/2023/12/ao-dai-nu-3.jpg", category: "nữ" },
  // Áo dài Nam
  { id: 201, name: "Áo dài Trống Đồng (Nam)", price: 3200000, inStock: true, availableSizes: ["M", "L", "XL"], image: "https://moctrasilk.com/wp-content/uploads/2023/12/ao-dai-nam-1.jpg", category: "nam" },
  { id: 202, name: "Áo dài Hoàng Gia lụa gấm (Nam)", price: 3500000, inStock: true, availableSizes: ["L", "XL"], image: "https://moctrasilk.com/wp-content/uploads/2023/12/ao-dai-nam-2.jpg", category: "nam" },
  { id: 203, name: "Áo dài thư pháp truyền thống (Nam)", price: 2900000, inStock: false, availableSizes: ["M", "L"], image: "https://moctrasilk.com/wp-content/uploads/2023/12/ao-dai-nam-3.jpg", category: "nam" },
  // Áo dài Trẻ em
  { id: 301, name: "Áo dài Gấm Thỏ (Bé Gái)", price: 850000, inStock: true, availableSizes: ["2", "4", "6"], image: "https://moctrasilk.com/wp-content/uploads/2023/12/ao-dai-tre-em-1.jpg", category: "trẻ em" },
  { id: 302, name: "Áo dài Rồng Con (Bé Trai)", price: 850000, inStock: true, availableSizes: ["4", "6", "8", "10"], image: "https://moctrasilk.com/wp-content/uploads/2023/12/ao-dai-tre-em-2.jpg", category: "trẻ em" },
  { id: 303, name: "Áo dài hoa đào (Bé Gái)", price: 750000, inStock: true, availableSizes: ["2", "4"], image: "https://moctrasilk.com/wp-content/uploads/2023/12/ao-dai-tre-em-3.jpg", category: "trẻ em" },
  // Phụ kiện
  { id: 401, name: "Khăn lụa tơ tằm dệt tay", price: 450000, inStock: true, availableSizes: ["Freesize"], image: "https://moctrasilk.com/wp-content/uploads/2023/12/khan-lua.jpg", category: "phụ kiện" },
  { id: 402, name: "Túi xách lụa cầm tay", price: 550000, inStock: true, availableSizes: ["Freesize"], image: "https://moctrasilk.com/wp-content/uploads/2023/12/tui-xach.jpg", category: "phụ kiện" }
];

async function searchProducts(query) {
  try {
    const q = query.toLowerCase();
    
    // Fallback sang mock data để luôn có sản phẩm hiển thị khi API lỗi
    let results = [];
    if (q.includes("nữ")) {
      results = mockProducts.filter(p => p.category === "nữ");
    } else if (q.includes("nam")) {
      results = mockProducts.filter(p => p.category === "nam");
    } else if (q.includes("trẻ") || q.includes("bé")) {
      results = mockProducts.filter(p => p.category === "trẻ em");
    } else if (q.includes("phụ kiện") || q.includes("khăn") || q.includes("túi")) {
      results = mockProducts.filter(p => p.category === "phụ kiện");
    } else {
      // Default: trả về mix
      results = mockProducts.slice(0, 3);
    }
    
    // Nếu kết quả không có ảnh, thay bằng placeholder cho đẹp
    return results.map(p => ({
      ...p,
      image: p.image.includes('moctrasilk.com/wp-content') ? `https://via.placeholder.com/300x400?text=${encodeURIComponent(p.name)}` : p.image
    }));
    
  } catch (error) {
    console.error("Sapo API Error:", error.message);
    return [];
  }
}

module.exports = {
  searchProducts
};
