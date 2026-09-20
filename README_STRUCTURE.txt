NIPPON SALE — โครงสร้างไฟล์ (หลังแยก index.html)
================================================

หลักการ: ย้ายโค้ดเดิม "ตัดแปะทั้งก้อน" ไม่แก้ logic ใดๆ ทำงานเหมือนเดิม 100%
- ไม่มี build step / framework — deploy บน Cloudflare Pages แบบเดิม (ลากทั้งโฟลเดอร์)
- ทุกไฟล์ใน js/ เป็น <script> ธรรมดา (ไม่ใช่ module) ใช้ตัวแปร/ฟังก์ชันร่วมกันแบบ global เหมือนตอนอยู่ไฟล์เดียว
- **ลำดับการโหลดใน index.html สำคัญ** ห้ามสลับลำดับแท็ก <script>

โฟลเดอร์
--------
css/                 สไตล์ทั้งหมด (แยก 6 ไฟล์ ตามลำดับ cascade เดิม)
  base.css             ตัวแปรสี, พื้นฐาน, การ์ด, ฟอร์ม, แท็บ
  views-order.css      หน้าสั่งสินค้า และส่วนที่เกี่ยวข้อง
  gallon-incentive.css ค่าคอมแกลลอน
  overlays-mks.css     เมนูข้าง, ป๊อปอัพ PIN/ยืนยัน, รายงาน MKS
  auth-desktop.css     หน้า Login และเลย์เอาต์ Desktop
  header-widgets.css   header/ค้นหา/กระดิ่ง, กราฟและ widget ของแดชบอร์ด

js/data/seed-data.js          ข้อมูล seed (สินค้า, ประวัติขาย, เป้า) — ไฟล์ใหญ่ที่สุด
js/core/icons.js              ชุดไอคอน SVG
js/core/utils.js              ฟังก์ชันช่วย (fmt, todayISO, toast, ฯลฯ)
js/domain/commission-calc.js  ตารางและสูตรค่าคอมมิชชั่น
js/core/state.js              ตัวแปร state หลัก + month index cache
js/core/storage.js            storage helper + เก็บยอดขายรายแถว (Supabase/localStorage)
js/core/realtime-sync.js      sync ข้ามอุปกรณ์
js/core/persistence.js        loadAll / saveXxx
js/core/product-index.js      PRODUCT_INDEX / SERIES_INDEX
js/ui/dialogs.js              askPrompt / ensurePin
js/ui/navigation.js           แท็บ, เมนูข้าง, sidebar Desktop
js/ui/header.js               เลือกเดือน, ค้นหา, กระดิ่งแจ้งเตือน
js/ui/custom-select.js        custom select ทั้งแอพ
js/features/                  ฟีเจอร์ย่อย: audit-notifications, export-backup, import-products,
                              entry-form, bill-cart, customers, share-summary, gauge-celebration,
                              bill-grouping, action-center, gallon-incentive
js/views/                     หน้าจอ: dashboard, commission, history, stock, stock-bulk, order,
                              products, yearly, settings, mks
js/app.js                     bootstrap (ต้องโหลดเป็นไฟล์สุดท้าย)

ไฟล์ที่ไม่ได้แตะ: auth.js, supabase-config.js, supabase-setup.sql, manifest.json, ไอคอนทั้งหมด

ข้อควรจำตอนอัปเดตครั้งต่อไป
---------------------------
1) Service Worker ใช้ cache-first สำหรับไฟล์ทั่วไป ทุกครั้งที่แก้ไฟล์ใน css/ หรือ js/
   แล้ว deploy ให้เปลี่ยนค่า CACHE_NAME ใน sw.js (เช่น v4-modular -> v5) ไม่งั้นเครื่องที่ติดตั้ง PWA
   จะยังเห็นของเก่า
2) เพิ่มไฟล์ใหม่ = เพิ่มแท็ก <script>/<link> ใน index.html + เพิ่มใน SHELL ของ sw.js
