import {
  ArrowUpRight, BarChart3, Check, ChevronRight, Clock3, Menu, MessageCircle,
  PackageCheck, QrCode, ShieldCheck, Sparkles, X,
} from 'lucide-react';
import { useState } from 'react';

const features = [
  { icon: PackageCheck, label: 'Order to pickup', title: 'Setiap pakaian punya jejak.', copy: 'Status, SLA, rak, dan pembayaran dalam satu alur yang mudah dipahami tim outlet.' },
  { icon: MessageCircle, label: 'WhatsApp siap kirim', title: 'Pelanggan tahu sebelum bertanya.', copy: 'Notifikasi hanya berangkat saat cucian siap diambil—lengkap dengan rak dan jam buka.' },
  { icon: BarChart3, label: 'Angka yang bergerak', title: 'Kasir bekerja. Pemilik melihat.', copy: 'Shift, arus kas, piutang, dan laba bersih tersaji tanpa spreadsheet yang tercecer.' },
];

export function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  return <div className="site-shell">
    <header className="nav-wrap">
      <a className="brand" href="#top" aria-label="Orchid Brand home"><span className="brand-mark">o</span><span>orchid<span className="brand-dot">.</span>brand</span></a>
      <nav className={menuOpen ? 'nav-links is-open' : 'nav-links'} aria-label="Main navigation">
        <a href="#cara-kerja" onClick={() => setMenuOpen(false)}>Cara kerja</a>
        <a href="#fitur" onClick={() => setMenuOpen(false)}>Fitur</a>
        <a href="#operasional" onClick={() => setMenuOpen(false)}>Untuk outlet</a>
        <a className="nav-login" href="http://localhost:5173">Masuk dashboard <ArrowUpRight size={15} /></a>
      </nav>
      <button className="menu-button" onClick={() => setMenuOpen(!menuOpen)} aria-label={menuOpen ? 'Tutup menu' : 'Buka menu'}>{menuOpen ? <X /> : <Menu />}</button>
    </header>

    <main id="top">
      <section className="hero section-pad">
        <div className="hero-copy">
          <p className="eyebrow"><span className="eyebrow-dot" /> LAUNDRY OPERATING SYSTEM</p>
          <h1>Kerja rapi.<br /><em>Outlet tumbuh.</em></h1>
          <p className="hero-lead">Orchid Brand menyatukan kasir, cucian, pelanggan, dan angka bisnis dalam satu ruang kerja yang tenang.</p>
          <div className="hero-actions"><a className="button button-primary" href="http://localhost:5173">Lihat dashboard <ArrowUpRight size={17} /></a><a className="text-link" href="#cara-kerja">Pelajari cara kerja <ChevronRight size={17} /></a></div>
          <div className="hero-proof"><div className="avatars"><span>R</span><span>M</span><span>A</span></div><p><strong>Dipakai tim laundry</strong><br />yang ingin lebih siap setiap hari.</p></div>
        </div>
        <div className="hero-visual" aria-label="Preview dashboard Orchid Brand">
          <div className="visual-orbit orbit-one" /><div className="visual-orbit orbit-two" />
          <div className="dash-card main-card"><div className="dash-top"><span className="mini-logo">o</span><span>OPERATIONS / TODAY</span><span className="live-dot">LIVE</span></div><div className="dash-title"><div><span className="muted-label">Kamis, 22 September</span><h3>Selamat pagi, Rani.</h3></div><div className="sun-symbol">☼</div></div><div className="metric-row"><div><span className="muted-label">Pesanan aktif</span><strong>128</strong><span className="positive">+18.4%</span></div><div><span className="muted-label">Siap diambil</span><strong>24</strong><span className="warning">butuh ruang</span></div></div><div className="chart"><div className="chart-label"><span>Order minggu ini</span><strong>Rp 8,42 jt</strong></div><div className="chart-bars"><i style={{height:'34%'}}/><i style={{height:'55%'}}/><i style={{height:'43%'}}/><i style={{height:'72%'}}/><i style={{height:'62%'}}/><i className="today" style={{height:'94%'}}/><i style={{height:'76%'}}/></div><div className="chart-days"><span>Sen</span><span>Sel</span><span>Rab</span><span>Kam</span><span>Jum</span><span>Sab</span><span>Min</span></div></div></div>
          <div className="floating-card ready-card"><span className="icon-bubble green"><Check size={16}/></span><div><b>24 cucian siap diambil</b><small>Notifikasi WhatsApp terkirim</small></div></div>
          <div className="floating-card shift-card"><span className="icon-bubble navy"><Clock3 size={16}/></span><div><b>Shift pagi aktif</b><small>Kas awal Rp 300.000</small></div></div>
          <div className="receipt-peek"><QrCode size={38}/><span>SCAN<br />TRACK</span></div>
        </div>
      </section>

      <section className="signal-bar"><div><span className="signal-number">01</span><span>Alur cucian yang jelas</span></div><div><span className="signal-number">02</span><span>Kasir yang terkendali</span></div><div><span className="signal-number">03</span><span>Pemilik yang punya kendali</span></div><div className="signal-caption">Built for the<br /><i>real</i> laundry day.</div></section>

      <section className="intro section-pad" id="cara-kerja"><div className="section-kicker">WHY ORCHID BRAND</div><div className="intro-grid"><h2>Yang rumit di belakang layar,<br /><em>terasa sederhana</em> di depan.</h2><div><p className="large-copy">Bisnis laundry tidak kekurangan kerja keras. Yang sering hilang adalah visibilitas—di antara nota, chat, rak, shift, dan laporan.</p><p className="body-copy">Orchid Brand memberi tim Anda satu sumber kebenaran, supaya setiap order bergerak tepat waktu dan setiap keputusan dibuat dari data yang nyata.</p></div></div></section>

      <section className="feature-section section-pad" id="fitur"><div className="section-heading"><div><div className="section-kicker">ONE SYSTEM, EVERY HANDOFF</div><h2>Ritme outlet,<br /><em>diatur dengan baik.</em></h2></div><p>Dirancang untuk pekerjaan yang terjadi setiap hari—bukan demo yang hanya terlihat bagus.</p></div><div className="feature-grid">{features.map(({icon: Icon, label, title, copy}) => <article className="feature-card" key={label}><div className="feature-icon"><Icon size={22}/></div><span className="card-label">{label}</span><h3>{title}</h3><p>{copy}</p><a href="http://localhost:5173">Buka di dashboard <ArrowUpRight size={15}/></a></article>)}</div></section>

      <section className="workflow section-pad" id="operasional"><div className="workflow-copy"><div className="section-kicker">FROM DROP-OFF TO DONE</div><h2>Semua orang tahu<br /><em>langkah berikutnya.</em></h2><p>Tim kasir tidak perlu menghafal sistem. Owner tidak perlu mengejar laporan. Orchid membuat status kerja terasa seperti bahasa yang sama.</p><a className="button button-dark" href="http://localhost:5173">Mulai dari dashboard <ArrowUpRight size={17}/></a></div><div className="steps"><div className="step active"><span className="step-line"/><div className="step-icon"><QrCode size={19}/></div><div><span>01 / TERIMA</span><h3>Order masuk, detail lengkap.</h3><p>Layanan, berat, rak, dan estimasi selesai tercatat sejak awal.</p></div></div><div className="step"><span className="step-line"/><div className="step-icon"><Sparkles size={19}/></div><div><span>02 / KERJAKAN</span><h3>Status bergerak sesuai proses.</h3><p>Semua anggota tim melihat prioritas dan SLA yang sama.</p></div></div><div className="step"><div className="step-icon"><ShieldCheck size={19}/></div><div><span>03 / SELESAIKAN</span><h3>Pelanggan datang tepat waktu.</h3><p>WhatsApp dan QR tracking menutup lingkaran layanan.</p></div></div></div></section>

      <section className="cta-section section-pad"><div className="cta-inner"><span className="cta-orbit"/><div className="section-kicker">THE NEXT GOOD SHIFT</div><h2>Bangun outlet yang<br /><em>siap untuk besok.</em></h2><p>Mulai dengan sistem yang mengerti cara laundry benar-benar bekerja.</p><a className="button button-light" href="http://localhost:5173">Masuk ke Orchid Brand <ArrowUpRight size={17}/></a></div></section>
    </main>
    <footer><a className="brand" href="#top"><span className="brand-mark">o</span><span>orchid<span className="brand-dot">.</span>brand</span></a><span>Smart operations for laundry businesses.</span><span>© 2026 Orchid Brand</span></footer>
  </div>;
}
