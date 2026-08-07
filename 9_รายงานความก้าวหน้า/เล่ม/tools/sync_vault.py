#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Sync เนื้อหาจาก LaTeX (.tex = source of truth) -> Obsidian vault (.md mirror)

ดัดแปลงจาก book-builder/assets/sync_vault.py ให้เข้ากับโครงเล่มรายงานนี้
(chapters/chNN.tex แบบไฟล์เดียว ไม่ใช่โฟลเดอร์ต่อบท + รองรับ frontmatter/backmatter)

เขียนเฉพาะ "ระหว่าง marker" <!-- SYNC:CONTENT:START/END -->
ส่วนที่เขียนมือด้านบน (แผนการปรับปรุง / สิ่งที่ต้องเช็ค) จะไม่ถูกทับ — รันซ้ำได้ (idempotent)

usage:  python3 tools/sync_vault.py            # sync ทุกไฟล์
        python3 tools/sync_vault.py --check    # ดูว่าไฟล์ไหนจะเปลี่ยน ไม่เขียนจริง
"""
import re, sys, pathlib

BOOK = pathlib.Path(__file__).resolve().parent.parent            # .../9_รายงานความก้าวหน้า/เล่ม
VAULT = BOOK.parent.parent / "RPF_Researcher_Profile_vault" / "1_Projects" / "รายงานผลการดำเนินงาน-2569"
START, END = "<!-- SYNC:CONTENT:START -->", "<!-- SYNC:CONTENT:END -->"
CHECK = "--check" in sys.argv

# (ไฟล์ .tex ต้นทาง, ไฟล์ .md ปลายทางใน vault)
PAIRS = [
    ("frontmatter/preface.tex",        "frontmatter/คำนำ.md"),
    ("frontmatter/exec-summary.tex",   "frontmatter/บทสรุปผู้บริหาร.md"),
    ("chapters/ch01.tex",              "chapters/ch01.md"),
    ("chapters/ch02.tex",              "chapters/ch02.md"),
    ("chapters/ch03.tex",              "chapters/ch03.md"),
    ("chapters/ch04.tex",              "chapters/ch04.md"),
    ("chapters/ch05.tex",              "chapters/ch05.md"),
    ("chapters/ch06.tex",              "chapters/ch06.md"),
    ("chapters/ch07.tex",              "chapters/ch07.md"),
    ("backmatter/appendix-a.tex",      "backmatter/ภาคผนวก-ก.md"),
    ("backmatter/appendix-b.tex",      "backmatter/ภาคผนวก-ข.md"),
    ("backmatter/acknowledgement.tex", "backmatter/กิตติกรรมประกาศ.md"),
]

CALLOUT = {"infobox": "[!note] หมายเหตุ", "tipbox": "[!tip] เคล็ดลับ",
           "warnbox": "[!warning] ข้อควรระวัง", "examplebox": "[!example] ตัวอย่าง"}


def inline(s):
    s = re.sub(r'\\textbf\{([^{}]*)\}', r'**\1**', s)
    s = re.sub(r'\\textit\{([^{}]*)\}', r'*\1*', s)
    s = re.sub(r'\\emph\{([^{}]*)\}', r'*\1*', s)
    s = re.sub(r'\\(eqref|ref)\{[^}]*\}', '(อ้างอิง)', s)
    s = re.sub(r'\\footnote\{[^}]*\}', '', s)
    s = re.sub(r'\\(noindent|centering|small|footnotesize|normalsize|toprule|midrule|bottomrule)\b', '', s)
    s = s.replace(r'$\cdot$', '·').replace(r'$\times$', '×').replace(r'$=$', '=')
    s = s.replace('\\&', '&').replace('\\%', '%').replace('\\_', '_').replace('\\#', '#')
    s = s.replace('``', '"').replace("''", '"').replace('~', ' ')
    s = s.replace('---', '—').replace('--', '–')
    return s.strip()


def convert(tex):
    out, in_table, callout_stack = [], False, []
    for line in tex.split('\n'):
        st = line.strip()
        if st.startswith('%') or not st:
            if not st:
                out.append('')
            continue

        # callout -> Obsidian callout
        m = re.match(r'\\begin\{(infobox|tipbox|warnbox|examplebox)\}', st)
        if m:
            out.append(f'> {CALLOUT[m.group(1)]}')
            callout_stack.append(True)
            continue
        if re.match(r'\\end\{(infobox|tipbox|warnbox|examplebox)\}', st):
            if callout_stack:
                callout_stack.pop()
            out.append('')
            continue

        # หัวข้อ
        hit = False
        for pat, pre in [(r'\\chapter\*?\{(.*)\}', '# '), (r'\\subsubsection\*?\{(.*)\}', '#### '),
                         (r'\\subsection\*?\{(.*)\}', '### '), (r'\\section\*?\{(.*)\}', '## ')]:
            m = re.match(pat, st)
            if m:
                out.append(pre + inline(m.group(1)))
                hit = True
                break
        if hit:
            continue

        # ตาราง
        if re.match(r'\\begin\{tabular\}', st):
            in_table = True
            out.append('')
            continue
        if re.match(r'\\end\{tabular\}', st):
            in_table = False
            continue
        m = re.match(r'\\caption\{(.*)\}', st)
        if m:
            out.append(f'**ตาราง:** {inline(m.group(1))}')
            continue
        if re.match(r'\\input\{data/(.*)\}', st):
            f = re.match(r'\\input\{data/(.*)\}', st).group(1)
            out.append(f'> [!abstract] ตารางสร้างอัตโนมัติจากฐานข้อมูล\n> ไฟล์ `เล่ม/data/{f}` — regenerate ด้วย `tools/gen_tables.js` (ดู runbook)')
            continue
        if re.match(r'\\(begin|end)\{(figure|table|center|enumerate|itemize|minipage|flushright|titlepage|tikzpicture)\}', st):
            continue
        if re.match(r'\\(label|addcontentsline|markboth|vspace|hspace|hline|rowcolor|cellcolor|cline|multirow|'
                    r'arraystretch|renewcommand|setlength|thispagestyle|clearpage|cleardoublepage|par|fill|color|'
                    r'definecolor|input|tableofcontents|listoftables|frontmatter|mainmatter|backmatter|appendix|'
                    r'documentclass|usepackage|begin\{document\}|end\{document\}|fontsize|selectfont|LARGE|Large|huge)', st):
            continue

        s = inline(line)
        s = re.sub(r'^\s*\\item\s*', '- ', s)
        if in_table and '&' in s:
            cells = [c.strip() for c in re.sub(r'\\\\\s*$', '', s).split('&')]
            s = '| ' + ' | '.join(cells) + ' |'
        else:
            s = re.sub(r'\\\\\s*$', '', s)
        s = re.sub(r'\\[a-zA-Z]+\*?', '', s).strip()   # เก็บกวาดคำสั่งที่เหลือ
        if not s:
            continue
        if callout_stack:
            s = '> ' + s
        out.append(s)

    md = re.sub(r'\n{3,}', '\n\n', '\n'.join(out)).strip()
    return md


changed = skipped = missing = 0
for src_rel, dst_rel in PAIRS:
    src, dst = BOOK / src_rel, VAULT / dst_rel
    if not src.exists():
        print(f'  ✗ ไม่พบ .tex : {src_rel}')
        missing += 1
        continue
    if not dst.exists():
        print(f'  ✗ ไม่พบ .md  : {dst_rel} (สร้างไฟล์ + ใส่ marker ก่อน)')
        missing += 1
        continue
    body = convert(src.read_text(encoding='utf-8'))
    body = re.sub(r'^#\s+.+\n', '', body, count=1)     # ตัดหัวเรื่องแรก (md มี title ของตัวเอง)
    txt = dst.read_text(encoding='utf-8')
    if START not in txt or END not in txt:
        print(f'  ✗ ไม่พบ marker ใน {dst_rel}')
        missing += 1
        continue
    new = re.sub(re.escape(START) + r'.*?' + re.escape(END),
                 lambda _: START + '\n' + body.strip() + '\n' + END, txt, flags=re.S)
    if new == txt:
        skipped += 1
        print(f'  = ไม่เปลี่ยน  : {dst_rel}')
        continue
    if CHECK:
        print(f'  ~ จะเปลี่ยน  : {dst_rel}')
    else:
        dst.write_text(new, encoding='utf-8')
        print(f'  ✓ sync      : {dst_rel}')
    changed += 1

print(f'\nสรุป: เปลี่ยน {changed} · เหมือนเดิม {skipped} · ปัญหา {missing}'
      + ('  [--check: ไม่ได้เขียนจริง]' if CHECK else ''))
