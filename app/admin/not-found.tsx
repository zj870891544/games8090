import Link from "next/link";
export default function AdminNotFound() {
  return (
    <div className="page">
      <section className="admin-panel">
        <h1>未找到此后台页面</h1>
        <p>页面地址可能有误，请返回管理首页。</p>
        <Link className="button primary" href="/admin">
          返回管理首页
        </Link>
      </section>
    </div>
  );
}
