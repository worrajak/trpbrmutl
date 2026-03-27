import { staff } from "@/lib/data";

const roleBadge: Record<string, { cls: string }> = {
  ที่ปรึกษา: { cls: "bg-purple-100 text-purple-700" },
  ผู้บริหาร: { cls: "bg-royal-100 text-royal-700" },
  คณะทำงาน: { cls: "bg-blue-100 text-blue-700" },
  เจ้าหน้าที่: { cls: "bg-gray-100 text-gray-600" },
};

const roleOrder = ["ที่ปรึกษา", "ผู้บริหาร", "คณะทำงาน", "เจ้าหน้าที่"] as const;

export default function StaffPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-royal-700">
          บุคลากรกลุ่มแผนงานใต้ร่มพระบารมี
        </h1>
        <p className="text-sm text-gray-600">
          ข้อมูลจาก trpb.rmutl.ac.th | มหาวิทยาลัยเทคโนโลยีราชมงคลล้านนา
        </p>
      </div>

      {roleOrder.map((role) => {
        const members = staff.filter((s) => s.role === role);
        if (members.length === 0) return null;
        const badge = roleBadge[role];
        return (
          <section key={role}>
            <h2 className="mb-3 text-lg font-semibold text-gray-800">{role}</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {members.map((s) => (
                <div
                  key={s.id}
                  className="rounded-lg bg-white p-5 shadow transition hover:shadow-md"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-royal-100 text-sm font-bold text-royal-700">
                      {s.name.replace(/^(รองศาสตราจารย์|ผศ\.|ผศ |นาย|นาง|นางสาว|ดร\.?\s?)*/g, "").charAt(0)}
                    </div>
                    <span
                      className={`rounded px-2 py-0.5 text-xs font-medium ${badge.cls}`}
                    >
                      {role}
                    </span>
                  </div>
                  <h3 className="mt-3 text-sm font-semibold text-gray-900">
                    {s.name}
                  </h3>
                  <p className="mt-1 text-xs text-gray-500">{s.position}</p>
                  {(s.email || s.phone) && (
                    <div className="mt-3 space-y-1 border-t pt-2 text-xs text-gray-500">
                      {s.email && <p>Email: {s.email}</p>}
                      {s.phone && <p>Tel: {s.phone}</p>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        );
      })}

      <div className="rounded bg-gray-50 p-4 text-xs text-gray-500">
        <p>
          ที่มา:{" "}
          <a
            href="https://trpb.rmutl.ac.th/structure/staff"
            target="_blank"
            rel="noopener noreferrer"
            className="text-royal-600 hover:underline"
          >
            trpb.rmutl.ac.th/structure/staff
          </a>
        </p>
        <p>128 ถ.ห้วยแก้ว ต.ช้างเผือก อ.เมือง จ.เชียงใหม่ 50300 | โทร. 0 5392 1444 ต่อ 1189 | trpb.rmutl@gmail.com</p>
      </div>
    </div>
  );
}
