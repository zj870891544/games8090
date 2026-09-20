"use client";
export default function AdminError({ reset }: { reset: () => void }) {
  return (
    <div className="page">
      <section className="admin-panel">
        <h1>后台页面暂时无法加载</h1>
        <p>请稍后重试。如果问题持续，请检查数据库连接和服务端配置。</p>
        <button className="button primary" onClick={reset}>
          重新加载
        </button>
      </section>
    </div>
  );
}
