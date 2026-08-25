NIPPON SALE — ย้ายจาก Netlify ไป Cloudflare Pages
====================================================

สิ่งที่เปลี่ยน:
- ลบ netlify.toml ออก (ใช้ไม่ได้กับ Cloudflare)
- เพิ่มไฟล์ _headers แทน (ทำหน้าที่เดียวกัน คือกำหนด Content-Type และ
  Cache-Control ให้ manifest.json, sw.js, auth.js)
- ไฟล์อื่นทั้งหมด (index.html, auth.js, supabase-config.js, ไอคอนต่างๆ)
  ไม่ต้องแก้อะไรเลย เพราะเป็น static/browser-side ล้วนๆ

วิธี Deploy (แบบลาก-วาง ไม่ต้องใช้ Git ก็ได้):
1. ไปที่ https://dash.cloudflare.com/ → สมัคร/ล็อกอิน
2. เมนูซ้าย เลือก "Workers & Pages" → "Create" → แท็บ "Pages"
3. เลือก "Upload assets" (ไม่ต้องเชื่อม Git)
4. ตั้งชื่อโปรเจกต์ เช่น nippon-sale
5. ลากทั้งโฟลเดอร์นี้ (ทุกไฟล์ รวม _headers, manifest.json, sw.js ฯลฯ)
   เข้าไปในหน้าอัปโหลด แล้วกด Deploy
6. รอสักครู่ จะได้ URL แบบ https://nippon-sale.pages.dev

วิธี Deploy ผ่าน Git (แนะนำถ้าจะอัปเดตบ่อยๆ):
1. Push โฟลเดอร์นี้ขึ้น GitHub repo
2. ใน Cloudflare Pages เลือก "Connect to Git" แทน "Upload assets"
3. เลือก repo → Build settings ปล่อยว่างไว้ได้เลย (ไม่มี build step,
   Framework preset: "None", Build command: ว่าง, Output directory: /)
4. Deploy — ทุกครั้งที่ push โค้ดใหม่จะ deploy อัตโนมัติ

หลัง Deploy:
- ถ้าใช้ custom domain เดิม ให้ไปตั้งค่าใน Cloudflare Pages > Custom domains
  แล้วเปลี่ยน DNS/nameserver ตามที่ระบบแนะนำ
- Supabase config (URL/anon key) ทำงานเหมือนเดิมทุกอย่าง เพราะเรียกจาก
  browser ตรง ไม่เกี่ยวกับ host

ข้อดีของ Cloudflare Pages เทียบ Netlify free tier:
- Bandwidth ไม่จำกัด (Netlify ฟรีจำกัด 100GB/เดือน)
- Build 500 ครั้ง/เดือน ฟรี
- CDN ครอบคลุมทั่วโลกเหมือนกัน, HTTPS ฟรีอัตโนมัติ
