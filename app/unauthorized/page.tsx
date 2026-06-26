export default function UnauthorizedPage() {
  return (
    <main className="min-h-screen bg-slate-100 px-6 py-10 text-slate-900">
      <section className="mx-auto flex min-h-[80vh] max-w-4xl items-center justify-center">
        <div className="w-full rounded-3xl bg-white p-10 text-center shadow-sm">
          <p className="text-sm text-slate-400">Access Denied</p>

          <h1 className="mt-5 text-4xl font-bold text-red-600">
            无权限访问后台
          </h1>

          <p className="mt-5 text-slate-500">
            当前账号不是管理员，不能进入后台工单管理页面。
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <a
              href="/"
              className="rounded-xl bg-blue-600 px-6 py-3 font-bold text-white"
            >
              返回客户首页
            </a>

            <a
              href="/login"
              className="rounded-xl border border-slate-200 bg-white px-6 py-3 font-bold text-slate-700"
            >
              重新登录
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
