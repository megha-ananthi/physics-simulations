/* 8085 assembler, emulator and trainer-kit widget (window.CPU8085).
   The core (assemble / Machine / run) has no DOM dependency so it can be unit-tested
   headlessly (JavaScriptCore `jsc cpu8085.js programs8085.js cpu8085.test.js`). */
(function (global) {
    'use strict';

    const REG = { B: 0, C: 1, D: 2, E: 3, H: 4, L: 5, M: 6, A: 7 };
    const RNAME = ['B', 'C', 'D', 'E', 'H', 'L', 'M', 'A'];
    const RP = { B: 0, BC: 0, D: 1, DE: 1, H: 2, HL: 2, SP: 3 };
    const RP_PUSH = { B: 0, BC: 0, D: 1, DE: 1, H: 2, HL: 2, PSW: 3 };
    const RPNAME = ['B', 'D', 'H', 'SP'];
    const RPPNAME = ['B', 'D', 'H', 'PSW'];
    const ALU = ['ADD', 'ADC', 'SUB', 'SBB', 'ANA', 'XRA', 'ORA', 'CMP'];
    const ALUI = ['ADI', 'ACI', 'SUI', 'SBI', 'ANI', 'XRI', 'ORI', 'CPI'];
    const CONDS = ['NZ', 'Z', 'NC', 'C', 'PO', 'PE', 'P', 'M'];
    const IMPLIED = {
        NOP: 0x00, RLC: 0x07, RRC: 0x0F, RAL: 0x17, RAR: 0x1F, DAA: 0x27, CMA: 0x2F, STC: 0x37, CMC: 0x3F,
        HLT: 0x76, RET: 0xC9, XCHG: 0xEB, XTHL: 0xE3, PCHL: 0xE9, SPHL: 0xF9, DI: 0xF3, EI: 0xFB, RIM: 0x20, SIM: 0x30,
    };
    const ADDR16 = { LDA: 0x3A, STA: 0x32, LHLD: 0x2A, SHLD: 0x22, JMP: 0xC3, CALL: 0xCD };

    const h2 = (n) => (n & 0xFF).toString(16).toUpperCase().padStart(2, '0');
    const h4 = (n) => (n & 0xFFFF).toString(16).toUpperCase().padStart(4, '0');

    function mnemonicSize(m) {
        if (m in IMPLIED) return 1;
        if (m === 'MOV' || m === 'INR' || m === 'DCR' || m === 'INX' || m === 'DCX' || m === 'DAD' ||
            m === 'LDAX' || m === 'STAX' || m === 'PUSH' || m === 'POP' || m === 'RST' || ALU.includes(m)) return 1;
        if (/^R(NZ|Z|NC|C|PO|PE|P|M)$/.test(m)) return 1;
        if (m === 'MVI' || m === 'IN' || m === 'OUT' || ALUI.includes(m)) return 2;
        if (m === 'LXI' || m in ADDR16 || /^[JC](NZ|Z|NC|C|PO|PE|P|M)$/.test(m)) return 3;
        return -1;
    }

    // ------------------------------------------------------------------ assembler
    /* Source syntax (one instruction per line):
         LABEL: MNEMONIC OPERANDS   ; comment
       Numbers are hexadecimal, with or without a trailing H (4200, 4200H, 0FFH).
       Directives: ORG addr · NAME EQU value · DB b1,b2,...
       A comment in square brackets at the end, e.g. "; text [note]", is kept as a note. */
    function assemble(source, origin) {
        const lines = [];
        const symbols = {};
        const errors = [];
        let pc = origin === undefined ? 0x8000 : origin;
        const raw = String(source).replace(/\r/g, '').split('\n');

        const parseLine = (text, lineNo) => {
            let code = text, comment = '';
            const semi = text.indexOf(';');
            if (semi >= 0) { code = text.slice(0, semi); comment = text.slice(semi + 1).trim(); }
            code = code.trim();
            let label = '';
            const m = code.match(/^([A-Za-z_][\w]*)\s*:\s*(.*)$/);
            if (m) { label = m[1].toUpperCase(); code = m[2].trim(); }
            let mnem = '', ops = '';
            if (code) {
                const sp = code.search(/\s/);
                mnem = (sp < 0 ? code : code.slice(0, sp)).toUpperCase();
                ops = sp < 0 ? '' : code.slice(sp).trim();
                // "NAME EQU value" and bare labels without a colon
                const parts = code.split(/\s+/);
                if (parts.length >= 3 && parts[1].toUpperCase() === 'EQU') { label = parts[0].toUpperCase(); mnem = 'EQU'; ops = parts.slice(2).join(' '); }
                else if (!label && parts.length >= 2 && mnemonicSize(mnem) < 0 && !['ORG', 'DB', 'EQU'].includes(mnem) &&
                    (mnemonicSize(parts[1].toUpperCase()) >= 0 || ['DB'].includes(parts[1].toUpperCase()))) {
                    label = mnem; code = code.slice(parts[0].length).trim();
                    const sp2 = code.search(/\s/);
                    mnem = (sp2 < 0 ? code : code.slice(0, sp2)).toUpperCase();
                    ops = sp2 < 0 ? '' : code.slice(sp2).trim();
                }
            }
            let note = '';
            const nm = comment.match(/\[([^\]]*)\]\s*$/);
            if (nm) { note = nm[1]; comment = comment.slice(0, nm.index).trim(); }
            const operands = ops ? ops.split(',').map(s => s.trim()).filter(s => s.length) : [];
            return { lineNo, src: text, label, mnem, operands, comment, note };
        };

        // pass 1: addresses and symbols
        raw.forEach((text, i) => {
            const L = parseLine(text, i + 1);
            L.addr = pc; L.size = 0;
            if (L.mnem === 'ORG') { pc = parseNum(L.operands[0]); L.addr = pc; L.kind = 'dir'; }
            else if (L.mnem === 'EQU') { L.kind = 'equ'; }
            else if (L.mnem === 'DB') { L.size = L.operands.length; L.kind = 'data'; }
            else if (L.mnem) {
                L.size = mnemonicSize(L.mnem);
                L.kind = 'code';
                if (L.size < 0) { errors.push('Line ' + L.lineNo + ': unknown instruction "' + L.mnem + '"'); L.size = 0; }
            } else L.kind = L.label ? 'label' : 'blank';
            if (L.label && L.mnem !== 'EQU') {
                if (L.label in symbols) errors.push('Line ' + L.lineNo + ': label ' + L.label + ' defined twice');
                symbols[L.label] = L.addr;
            }
            pc = (pc + L.size) & 0xFFFF;
            lines.push(L);
        });
        lines.forEach(L => { if (L.kind === 'equ') { try { symbols[L.label] = parseNum(L.operands[0]); } catch (e) { errors.push('Line ' + L.lineNo + ': bad EQU value'); } } });

        // pass 2: encode
        const bytes = {};
        const value = (tok, L) => {
            const t = tok.toUpperCase();
            if (t in symbols) return symbols[t];
            const ch = tok.match(/^'(.)'$/);
            if (ch) return ch[1].charCodeAt(0);
            try { return parseNum(tok); } catch (e) { throw new Error('Line ' + L.lineNo + ': cannot understand "' + tok + '"'); }
        };
        const reg = (tok, L) => { const r = REG[tok.toUpperCase()]; if (r === undefined) throw new Error('Line ' + L.lineNo + ': "' + tok + '" is not a register'); return r; };
        const need = (L, n) => { if (L.operands.length !== n) throw new Error('Line ' + L.lineNo + ': ' + L.mnem + ' needs ' + n + ' operand' + (n === 1 ? '' : 's')); };

        lines.forEach(L => {
            if (L.kind !== 'code' && L.kind !== 'data') return;
            let b = [];
            try {
                const m = L.mnem, o = L.operands;
                if (L.kind === 'data') b = o.map(t => value(t, L) & 0xFF);
                else if (m in IMPLIED) { need(L, 0); b = [IMPLIED[m]]; }
                else if (m === 'MOV') {
                    need(L, 2);
                    const d = reg(o[0], L), s = reg(o[1], L);
                    if (d === 6 && s === 6) throw new Error('Line ' + L.lineNo + ': MOV M,M is not allowed');
                    b = [0x40 | (d << 3) | s];
                } else if (m === 'MVI') { need(L, 2); b = [0x06 | (reg(o[0], L) << 3), value(o[1], L) & 0xFF]; }
                else if (m === 'LXI') { need(L, 2); const rp = RP[o[0].toUpperCase()]; if (rp === undefined) throw new Error('Line ' + L.lineNo + ': bad register pair'); const v = value(o[1], L); b = [0x01 | (rp << 4), v & 0xFF, (v >> 8) & 0xFF]; }
                else if (m === 'INR' || m === 'DCR') { need(L, 1); b = [(m === 'INR' ? 0x04 : 0x05) | (reg(o[0], L) << 3)]; }
                else if (m === 'INX' || m === 'DCX' || m === 'DAD') {
                    need(L, 1); const rp = RP[o[0].toUpperCase()]; if (rp === undefined) throw new Error('Line ' + L.lineNo + ': bad register pair');
                    b = [({ INX: 0x03, DCX: 0x0B, DAD: 0x09 }[m]) | (rp << 4)];
                } else if (m === 'LDAX' || m === 'STAX') {
                    need(L, 1); const rp = RP[o[0].toUpperCase()]; if (rp !== 0 && rp !== 1) throw new Error('Line ' + L.lineNo + ': ' + m + ' works with B or D only');
                    b = [(m === 'LDAX' ? 0x0A : 0x02) | (rp << 4)];
                } else if (m === 'PUSH' || m === 'POP') {
                    need(L, 1); const rp = RP_PUSH[o[0].toUpperCase()]; if (rp === undefined) throw new Error('Line ' + L.lineNo + ': bad register pair');
                    b = [(m === 'PUSH' ? 0xC5 : 0xC1) | (rp << 4)];
                } else if (ALU.includes(m)) { need(L, 1); b = [0x80 | (ALU.indexOf(m) << 3) | reg(o[0], L)]; }
                else if (ALUI.includes(m)) { need(L, 1); b = [0xC6 | (ALUI.indexOf(m) << 3), value(o[0], L) & 0xFF]; }
                else if (m in ADDR16) { need(L, 1); const v = value(o[0], L); b = [ADDR16[m], v & 0xFF, (v >> 8) & 0xFF]; }
                else if (/^J(NZ|Z|NC|C|PO|PE|P|M)$/.test(m)) { need(L, 1); const v = value(o[0], L); b = [0xC2 | (CONDS.indexOf(m.slice(1)) << 3), v & 0xFF, (v >> 8) & 0xFF]; }
                else if (/^C(NZ|Z|NC|C|PO|PE|P|M)$/.test(m)) { need(L, 1); const v = value(o[0], L); b = [0xC4 | (CONDS.indexOf(m.slice(1)) << 3), v & 0xFF, (v >> 8) & 0xFF]; }
                else if (/^R(NZ|Z|NC|C|PO|PE|P|M)$/.test(m)) { need(L, 0); b = [0xC0 | (CONDS.indexOf(m.slice(1)) << 3)]; }
                else if (m === 'RST') { need(L, 1); const n = parseInt(o[0], 10); if (!(n >= 0 && n <= 7)) throw new Error('Line ' + L.lineNo + ': RST 0-7'); b = [0xC7 | (n << 3)]; }
                else if (m === 'IN' || m === 'OUT') { need(L, 1); b = [m === 'IN' ? 0xDB : 0xD3, value(o[0], L) & 0xFF]; }
            } catch (e) { errors.push(e.message); b = new Array(L.size).fill(0); }
            L.bytes = b;
            b.forEach((v, k) => { bytes[(L.addr + k) & 0xFFFF] = v; });
        });

        const code = lines.filter(L => L.kind === 'code' || L.kind === 'data');
        const start = code.length ? code[0].addr : (origin || 0x8000);
        const byAddr = {};
        code.forEach(L => { byAddr[L.addr] = L; });
        const labelAt = {};
        Object.keys(symbols).forEach(k => { if (!(symbols[k] in labelAt)) labelAt[symbols[k]] = k; });
        lines.filter(L => L.kind === 'code' && L.label).forEach(L => { labelAt[L.addr] = L.label; });
        return { lines, code, symbols, bytes, errors, start, byAddr, labelAt };
    }

    function parseNum(tok) {
        if (tok === undefined) throw new Error('missing number');
        let t = String(tok).trim().toUpperCase();
        if (/^[0-9A-F]+H$/.test(t)) t = t.slice(0, -1);
        else if (/^0X[0-9A-F]+$/.test(t)) t = t.slice(2);
        if (!/^[0-9A-F]+$/.test(t)) throw new Error('not a number: ' + tok);
        return parseInt(t, 16);
    }

    // ------------------------------------------------------------------ emulator
    function Machine(opts) {
        opts = opts || {};
        this.mem = new Uint8Array(65536);
        this.io = new Uint8Array(256);
        this.monitor = opts.monitor || {};
        this.reset(0x8000);
    }
    const parity = (v) => { v ^= v >> 4; v ^= v >> 2; v ^= v >> 1; return (~v) & 1; };

    Machine.prototype.reset = function (pc) {
        this.A = 0; this.B = 0; this.C = 0; this.D = 0; this.E = 0; this.H = 0; this.L = 0;
        this.SP = 0xFFF0; this.PC = pc === undefined ? 0x8000 : pc;
        this.F = { S: 0, Z: 0, AC: 0, P: 0, CY: 0 };
        this.halted = false; this.error = ''; this.steps = 0;
        this.outputs = [];
        this._reads = []; this._writes = [];
    };
    Machine.prototype.load = function (asm) {
        Object.keys(asm.bytes).forEach(a => { this.mem[a] = asm.bytes[a]; });
        this.asm = asm;
    };
    Machine.prototype.HL = function () { return (this.H << 8) | this.L; };
    Machine.prototype.getR = function (r) { return r === 6 ? this.rd(this.HL()) : this[RNAME[r]]; };
    Machine.prototype.setR = function (r, v) { v &= 0xFF; if (r === 6) this.wr(this.HL(), v); else this[RNAME[r]] = v; };
    Machine.prototype.getRP = function (rp) { if (rp === 3) return this.SP; const hi = RNAME[rp * 2], lo = RNAME[rp * 2 + 1]; return (this[hi] << 8) | this[lo]; };
    Machine.prototype.setRP = function (rp, v) { v &= 0xFFFF; if (rp === 3) { this.SP = v; return; } this[RNAME[rp * 2]] = v >> 8; this[RNAME[rp * 2 + 1]] = v & 0xFF; };
    Machine.prototype.rd = function (a) { a &= 0xFFFF; this._reads.push(a); return this.mem[a]; };
    Machine.prototype.wr = function (a, v) { a &= 0xFFFF; this._writes.push(a); this.mem[a] = v & 0xFF; };
    Machine.prototype.flagsByte = function () { const F = this.F; return (F.S << 7) | (F.Z << 6) | (F.AC << 4) | (F.P << 2) | 2 | F.CY; };
    Machine.prototype.setFlagsByte = function (b) { this.F = { S: (b >> 7) & 1, Z: (b >> 6) & 1, AC: (b >> 4) & 1, P: (b >> 2) & 1, CY: b & 1 }; };
    Machine.prototype.szp = function (v) { this.F.S = (v >> 7) & 1; this.F.Z = v === 0 ? 1 : 0; this.F.P = parity(v); };
    Machine.prototype.push16 = function (v) { this.SP = (this.SP - 1) & 0xFFFF; this.wr(this.SP, v >> 8); this.SP = (this.SP - 1) & 0xFFFF; this.wr(this.SP, v & 0xFF); };
    Machine.prototype.pop16 = function () { const lo = this.rd(this.SP); this.SP = (this.SP + 1) & 0xFFFF; const hi = this.rd(this.SP); this.SP = (this.SP + 1) & 0xFFFF; return (hi << 8) | lo; };
    Machine.prototype.cond = function (c) {
        const F = this.F;
        return [!F.Z, !!F.Z, !F.CY, !!F.CY, !F.P, !!F.P, !F.S, !!F.S][c];
    };
    Machine.prototype.alu = function (op, v) {
        const a = this.A, F = this.F;
        let r;
        if (op <= 1) {
            const c = op === 1 ? F.CY : 0;
            r = a + v + c;
            F.AC = ((a & 0xF) + (v & 0xF) + c) > 0xF ? 1 : 0;
            F.CY = r > 0xFF ? 1 : 0;
            r &= 0xFF; this.szp(r); this.A = r;
        } else if (op === 2 || op === 3 || op === 7) {
            const bw = op === 3 ? F.CY : 0, nv = (~v) & 0xFF;
            r = a + nv + (1 - bw);
            F.AC = ((a & 0xF) + (nv & 0xF) + (1 - bw)) > 0xF ? 1 : 0;
            F.CY = r > 0xFF ? 0 : 1;
            r &= 0xFF; this.szp(r);
            if (op !== 7) this.A = r;
        } else if (op === 4) { r = a & v; F.CY = 0; F.AC = 1; this.szp(r); this.A = r; }
        else if (op === 5) { r = a ^ v; F.CY = 0; F.AC = 0; this.szp(r); this.A = r; }
        else { r = a | v; F.CY = 0; F.AC = 0; this.szp(r); this.A = r; }
        return r;
    };

    /* Execute one instruction. Returns an info object describing what happened. */
    Machine.prototype.step = function () {
        if (this.halted) return null;
        this._reads = []; this._writes = [];
        const pc = this.PC, op = this.mem[pc];
        const b1 = this.mem[(pc + 1) & 0xFFFF], b2 = this.mem[(pc + 2) & 0xFFFF], w = (b2 << 8) | b1;
        const before = this.snapshot();
        const info = { pc, op, text: '', jump: null, taken: null };
        const F = this.F;
        const lab = (a) => (this.asm && this.asm.labelAt[a] ? this.asm.labelAt[a] + ' (' + h4(a) + 'H)' : h4(a) + 'H');
        const src = (r) => (r === 6 ? 'M[' + h4(this.HL()) + 'H]' : RNAME[r]);
        let size = 1;

        if (op === 0x76) { this.halted = true; info.text = 'HLT — the program stops here.'; info.mn = 'HLT'; }
        else if ((op & 0xC0) === 0x40) {
            const d = (op >> 3) & 7, s = op & 7, sname = src(s), dname = src(d);
            const v = this.getR(s); this.setR(d, v);
            info.mn = 'MOV ' + RNAME[d] + ',' + RNAME[s];
            info.text = 'Copied ' + sname + ' = <b>' + h2(v) + 'H</b> into ' + dname + '.';
        } else if ((op & 0xC0) === 0x80) {
            const k = (op >> 3) & 7, s = op & 7, v = this.getR(s), a0 = this.A, sname = src(s);
            this.alu(k, v);
            info.mn = ALU[k] + ' ' + RNAME[s];
            info.text = describeALU(ALU[k], a0, v, sname, this.A, this.F);
        } else if ((op & 0xC7) === 0x06) {
            const r = (op >> 3) & 7; size = 2; this.setR(r, b1);
            info.mn = 'MVI ' + RNAME[r] + ',' + h2(b1) + 'H';
            info.text = 'Loaded <b>' + h2(b1) + 'H</b> into ' + src(r) + '.';
        } else if ((op & 0xCF) === 0x01) {
            const rp = (op >> 4) & 3; size = 3; this.setRP(rp, w);
            info.mn = 'LXI ' + RPNAME[rp] + ',' + h4(w) + 'H';
            info.text = 'Loaded register pair ' + (rp === 3 ? 'SP' : RPNAME[rp] + RNAME[rp * 2 + 1]) + ' with <b>' + h4(w) + 'H</b>' + (rp === 2 ? ' — HL now points to memory ' + h4(w) + 'H.' : '.');
        } else if ((op & 0xC7) === 0x04 || (op & 0xC7) === 0x05) {
            const r = (op >> 3) & 7, inc = (op & 7) === 4, v = this.getR(r), nv = (v + (inc ? 1 : -1)) & 0xFF;
            F.AC = inc ? ((v & 0xF) === 0xF ? 1 : 0) : ((v & 0xF) !== 0 ? 1 : 0);
            this.setR(r, nv); this.szp(nv);
            info.mn = (inc ? 'INR ' : 'DCR ') + RNAME[r];
            info.text = (inc ? 'Incremented ' : 'Decremented ') + src(r) + ': ' + h2(v) + 'H → <b>' + h2(nv) + 'H</b>' + (nv === 0 ? ' — it became zero, so Z = 1.' : ' (Z = 0).') + ' CY is not affected.';
        } else if ((op & 0xCF) === 0x03 || (op & 0xCF) === 0x0B) {
            const rp = (op >> 4) & 3, inc = (op & 0xF) === 3, v = this.getRP(rp), nv = (v + (inc ? 1 : -1)) & 0xFFFF;
            this.setRP(rp, nv);
            const nm = rp === 3 ? 'SP' : RPNAME[rp] + RNAME[rp * 2 + 1];
            info.mn = (inc ? 'INX ' : 'DCX ') + RPNAME[rp];
            info.text = (inc ? 'Incremented' : 'Decremented') + ' the pair ' + nm + ': ' + h4(v) + 'H → <b>' + h4(nv) + 'H</b>' + (rp === 2 ? ' (HL now points to the ' + (inc ? 'next' : 'previous') + ' location).' : '.') + ' No flags change.';
        } else if ((op & 0xCF) === 0x09) {
            const rp = (op >> 4) & 3, r = this.HL() + this.getRP(rp);
            F.CY = r > 0xFFFF ? 1 : 0; this.setRP(2, r);
            info.mn = 'DAD ' + RPNAME[rp];
            info.text = 'HL = HL + ' + RPNAME[rp] + ' = <b>' + h4(r) + 'H</b>, CY = ' + F.CY + '.';
        } else if ((op & 0xC7) === 0xC6) {
            const k = (op >> 3) & 7, a0 = this.A; size = 2;
            this.alu(k, b1);
            info.mn = ALUI[k] + ' ' + h2(b1) + 'H';
            info.text = describeALU(ALU[k], a0, b1, h2(b1) + 'H', this.A, this.F);
        } else if ((op & 0xC7) === 0xC2) {
            const c = (op >> 3) & 7, t = this.cond(c); size = 3;
            info.mn = 'J' + CONDS[c] + ' ' + lab(w); info.jump = w; info.taken = t;
            info.text = condText(c, F) + (t ? ' → jumped to <b>' + lab(w) + '</b>.' : ' → no jump, continue with the next instruction.');
            if (t) { this.PC = w; size = 0; }
        } else if ((op & 0xC7) === 0xC4) {
            const c = (op >> 3) & 7, t = this.cond(c); size = 3;
            info.mn = 'C' + CONDS[c] + ' ' + lab(w); info.jump = w; info.taken = t;
            info.text = condText(c, F) + (t ? ' → called ' + lab(w) + '.' : ' → no call.');
            if (t) { this.push16((pc + 3) & 0xFFFF); this.PC = w; size = 0; }
        } else if ((op & 0xC7) === 0xC0) {
            const c = (op >> 3) & 7, t = this.cond(c);
            info.mn = 'R' + CONDS[c]; info.taken = t;
            info.text = condText(c, F) + (t ? ' → returned.' : ' → no return.');
            if (t) { this.PC = this.pop16(); size = 0; }
        } else if ((op & 0xC7) === 0xC7) {
            const n = (op >> 3) & 7;
            info.mn = 'RST ' + n;
            if (n === 1) { this.halted = true; info.text = 'RST 1 — return to the kit monitor (program ends).'; }
            else { this.push16((pc + 1) & 0xFFFF); this.PC = n * 8; size = 0; info.text = 'Restart ' + n + ': called ' + h4(n * 8) + 'H.'; }
        } else if ((op & 0xCF) === 0xC5 || (op & 0xCF) === 0xC1) {
            const rp = (op >> 4) & 3, isPush = (op & 0xF) === 5;
            info.mn = (isPush ? 'PUSH ' : 'POP ') + RPPNAME[rp];
            if (isPush) {
                const v = rp === 3 ? ((this.A << 8) | this.flagsByte()) : this.getRP(rp);
                this.push16(v); info.text = 'Saved ' + RPPNAME[rp] + ' (' + h4(v) + 'H) on the stack; SP = ' + h4(this.SP) + 'H.';
            } else {
                const v = this.pop16();
                if (rp === 3) { this.A = v >> 8; this.setFlagsByte(v & 0xFF); } else this.setRP(rp, v);
                info.text = 'Restored ' + RPPNAME[rp] + ' = ' + h4(v) + 'H from the stack.';
            }
        } else {
            switch (op) {
                case 0x00: info.mn = 'NOP'; info.text = 'No operation.'; break;
                case 0x02: case 0x12: { const rp = op >> 4; this.wr(this.getRP(rp), this.A); info.mn = 'STAX ' + RPNAME[rp]; info.text = 'Stored A (' + h2(this.A) + 'H) at ' + h4(this.getRP(rp)) + 'H.'; break; }
                case 0x0A: case 0x1A: { const rp = op >> 4; this.A = this.rd(this.getRP(rp)); info.mn = 'LDAX ' + RPNAME[rp]; info.text = 'Loaded A with M[' + h4(this.getRP(rp)) + 'H] = <b>' + h2(this.A) + 'H</b>.'; break; }
                case 0x22: size = 3; this.wr(w, this.L); this.wr(w + 1, this.H); info.mn = 'SHLD ' + h4(w) + 'H'; info.text = 'Stored L at ' + h4(w) + 'H and H at ' + h4(w + 1) + 'H.'; break;
                case 0x2A: size = 3; this.L = this.rd(w); this.H = this.rd(w + 1); info.mn = 'LHLD ' + h4(w) + 'H'; info.text = 'Loaded HL = <b>' + h4(this.HL()) + 'H</b> from ' + h4(w) + 'H.'; break;
                case 0x32: size = 3; this.wr(w, this.A); info.mn = 'STA ' + h4(w) + 'H'; info.text = 'Stored A = <b>' + h2(this.A) + 'H</b> into memory ' + h4(w) + 'H.'; break;
                case 0x3A: size = 3; this.A = this.rd(w); info.mn = 'LDA ' + h4(w) + 'H'; info.text = 'Loaded A with the byte at ' + h4(w) + 'H = <b>' + h2(this.A) + 'H</b>.'; break;
                case 0x07: { const a = this.A, c = a >> 7; this.A = ((a << 1) | c) & 0xFF; F.CY = c; info.mn = 'RLC'; info.text = 'Rotated A left: ' + bin8(a) + ' → <b>' + bin8(this.A) + '</b> (' + h2(this.A) + 'H), CY = ' + c + '.'; break; }
                case 0x0F: { const a = this.A, c = a & 1; this.A = ((a >> 1) | (c << 7)) & 0xFF; F.CY = c; info.mn = 'RRC'; info.text = 'Rotated A right: ' + bin8(a) + ' → <b>' + bin8(this.A) + '</b>; bit D0 (' + c + ') went into CY, so CY = ' + c + '.'; break; }
                case 0x17: { const a = this.A, c = a >> 7; this.A = ((a << 1) | F.CY) & 0xFF; F.CY = c; info.mn = 'RAL'; info.text = 'Rotated A left through carry → ' + h2(this.A) + 'H, CY = ' + c + '.'; break; }
                case 0x1F: { const a = this.A, c = a & 1; this.A = ((a >> 1) | (F.CY << 7)) & 0xFF; F.CY = c; info.mn = 'RAR'; info.text = 'Rotated A right through carry → ' + h2(this.A) + 'H, CY = ' + c + '.'; break; }
                case 0x27: {
                    const a = this.A; let corr = 0, cy = F.CY;
                    if ((a & 0x0F) > 9 || F.AC) corr |= 0x06;
                    if ((a >> 4) > 9 || F.CY || ((a >> 4) >= 9 && (a & 0x0F) > 9)) { corr |= 0x60; cy = 1; }
                    F.AC = ((a & 0x0F) + (corr & 0x0F)) > 0xF ? 1 : 0;
                    this.A = (a + corr) & 0xFF; this.szp(this.A); F.CY = cy;
                    info.mn = 'DAA';
                    info.text = 'Decimal-adjusted A: ' + h2(a) + 'H → <b>' + h2(this.A) + 'H</b>' + (corr ? ' (added ' + h2(corr) + 'H so it reads as BCD)' : ' (already valid BCD)') + (cy ? '; the decimal count passed 99, so CY = 1.' : '.');
                    break;
                }
                case 0x2F: { const a = this.A; this.A = (~a) & 0xFF; info.mn = 'CMA'; info.text = 'Complemented A: ' + h2(a) + 'H → <b>' + h2(this.A) + 'H</b> (every bit flipped).'; break; }
                case 0x37: F.CY = 1; info.mn = 'STC'; info.text = 'Set CY = 1.'; break;
                case 0x3F: F.CY ^= 1; info.mn = 'CMC'; info.text = 'Complemented CY → ' + F.CY + '.'; break;
                case 0x20: info.mn = 'RIM'; info.text = 'Read interrupt mask (no effect here).'; break;
                case 0x30: info.mn = 'SIM'; info.text = 'Set interrupt mask (no effect here).'; break;
                case 0xC3: size = 3; this.PC = w; size = 0; info.mn = 'JMP ' + lab(w); info.jump = w; info.taken = true; info.text = 'Jumped unconditionally to <b>' + lab(w) + '</b>.'; break;
                case 0xCD: {
                    info.mn = 'CALL ' + lab(w); info.jump = w;
                    const inProgram = this.asm && this.asm.byAddr[w];
                    if (!inProgram) {
                        size = 3;
                        const fn = this.monitor[w] || this.monitor.default;
                        info.monitor = true;
                        info.text = 'CALL ' + lab(w) + ' is a routine in the kit\'s monitor ROM' + (fn ? ': ' + fn(this) : '.') + ' The simulator runs it instantly and continues.';
                    } else { this.push16((pc + 3) & 0xFFFF); this.PC = w; size = 0; info.taken = true; info.text = 'Called subroutine <b>' + lab(w) + '</b>; return address ' + h4(pc + 3) + 'H saved on the stack.'; }
                    break;
                }
                case 0xC9: this.PC = this.pop16(); size = 0; info.mn = 'RET'; info.text = 'Returned from the subroutine to ' + lab(this.PC) + '.'; break;
                case 0xD3: size = 2; this.io[b1] = this.A; this.outputs.push({ port: b1, value: this.A }); info.mn = 'OUT ' + h2(b1) + 'H'; info.text = 'Sent A (' + h2(this.A) + 'H) to port ' + h2(b1) + 'H.'; break;
                case 0xDB: size = 2; this.A = this.io[b1]; info.mn = 'IN ' + h2(b1) + 'H'; info.text = 'Read port ' + h2(b1) + 'H into A.'; break;
                case 0xE3: { const lo = this.rd(this.SP), hi = this.rd(this.SP + 1); this.wr(this.SP, this.L); this.wr(this.SP + 1, this.H); this.L = lo; this.H = hi; info.mn = 'XTHL'; info.text = 'Exchanged HL with the top of the stack.'; break; }
                case 0xE9: this.PC = this.HL(); size = 0; info.mn = 'PCHL'; info.text = 'Jumped to the address in HL.'; break;
                case 0xEB: { const d = this.D, e = this.E; this.D = this.H; this.E = this.L; this.H = d; this.L = e; info.mn = 'XCHG'; info.text = 'Exchanged DE and HL.'; break; }
                case 0xF9: this.SP = this.HL(); info.mn = 'SPHL'; info.text = 'SP = HL.'; break;
                case 0xF3: info.mn = 'DI'; info.text = 'Interrupts disabled.'; break;
                case 0xFB: info.mn = 'EI'; info.text = 'Interrupts enabled.'; break;
                default:
                    this.halted = true; this.error = 'Invalid opcode ' + h2(op) + 'H at ' + h4(pc) + 'H — the program ran into memory that is not code.';
                    info.mn = '???'; info.text = this.error;
            }
        }
        if (size) this.PC = (pc + size) & 0xFFFF;
        info.size = size || mnemonicSize((info.mn || 'NOP').split(' ')[0]);
        info.reads = this._reads.slice(); info.writes = this._writes.slice();
        info.before = before; info.after = this.snapshot();
        this.steps++;
        return info;
    };
    Machine.prototype.snapshot = function () {
        return { A: this.A, B: this.B, C: this.C, D: this.D, E: this.E, H: this.H, L: this.L, SP: this.SP, PC: this.PC, F: Object.assign({}, this.F) };
    };

    function bin8(v) { return (v & 0xFF).toString(2).padStart(8, '0'); }
    function condText(c, F) {
        return ['Z = ' + F.Z + ' (checking “not zero”)', 'Z = ' + F.Z + ' (checking “zero”)', 'CY = ' + F.CY + ' (checking “no carry”)', 'CY = ' + F.CY + ' (checking “carry”)',
            'P = ' + F.P + ' (checking “parity odd”)', 'P = ' + F.P + ' (checking “parity even”)', 'S = ' + F.S + ' (checking “plus”)', 'S = ' + F.S + ' (checking “minus”)'][c];
    }
    function describeALU(name, a, v, sname, r, F) {
        const A = h2(a) + 'H', V = '<b>' + h2(v) + 'H</b>', R = '<b>' + h2(r) + 'H</b>';
        switch (name) {
            case 'ADD': case 'ADC': return 'A = A + ' + sname + (name === 'ADC' ? ' + CY' : '') + ': ' + A + ' + ' + V + ' = ' + R + (F.CY ? ' with a <b>carry out (CY = 1)</b>.' : ' (no carry, CY = 0).');
            case 'SUB': case 'SBB': return 'A = A − ' + sname + ': ' + A + ' − ' + V + ' = ' + R + (F.CY ? ' — a <b>borrow</b> was needed, so CY = 1.' : ' (no borrow, CY = 0).');
            case 'CMP': {
                const rel = a < v ? 'A is smaller' : a === v ? 'they are equal' : 'A is bigger';
                return 'Compared A (' + A + ') with ' + sname + ' (' + V + '): ' + rel + ', so CY = ' + F.CY + ' and Z = ' + F.Z + '. A is unchanged.';
            }
            case 'ANA': return 'A = A AND ' + sname + ': ' + bin8(a) + ' AND ' + bin8(v) + ' = <b>' + bin8(r) + '</b> (' + h2(r) + 'H).';
            case 'XRA': return 'A = A XOR ' + sname + ' = ' + R + (r === 0 && a === v ? ' (XRA with itself clears A).' : '.');
            case 'ORA': return 'A = A OR ' + sname + ' = ' + R + (F.Z ? ' — the result is zero, so Z = 1.' : ' (Z = 0).');
        }
        return '';
    }

    /* Assemble, preload memory and run to HLT (headless). */
    function run(source, memory, opts) {
        opts = opts || {};
        const asm = assemble(source);
        if (asm.errors.length) throw new Error(asm.errors.join('\n'));
        const m = new Machine({ monitor: opts.monitor });
        m.load(asm);
        Object.keys(memory || {}).forEach(a => { m.mem[Number(a)] = memory[a]; });
        m.reset(opts.start !== undefined ? opts.start : asm.start);
        const max = opts.maxSteps || 200000;
        while (!m.halted && m.steps < max) m.step();
        if (!m.halted) m.error = 'The program did not stop after ' + max + ' steps.';
        return m;
    }

    // ------------------------------------------------------------------ 7-segment digits
    const SEG = { '0': 'abcdef', '1': 'bc', '2': 'abged', '3': 'abgcd', '4': 'fgbc', '5': 'afgcd', '6': 'afgedc', '7': 'abc', '8': 'abcdefg', '9': 'abcdfg', A: 'abcefg', B: 'fedcg', C: 'afed', D: 'bcdeg', E: 'afged', F: 'afge', '-': 'g', ' ': '', H: 'fbgec', L: 'fed', P: 'abfge', R: 'eg', U: 'fedcb', r: 'eg' };
    function sevenSeg(str) {
        const segPath = {
            a: 'M5,2 h14 l-3,3 h-8 z', b: 'M20,3 v14 l-3,-2 v-9 z', c: 'M20,20 v14 l-3,-3 v-9 z', d: 'M5,35 h14 l-3,-3 h-8 z',
            e: 'M4,20 v14 l3,-3 v-9 z', f: 'M4,3 v14 l3,-2 v-9 z', g: 'M6,18.5 h12 l-2,-2 h-8 z M6,18.5 h12 l-2,2 h-8 z',
        };
        return '<svg viewBox="0 0 ' + (str.length * 26) + ' 38">' + str.split('').map((ch, i) => {
            const on = SEG[ch] || SEG[ch.toUpperCase()] || '';
            return '<g transform="translate(' + (i * 26) + ',0) skewX(-6)">' + 'abcdefg'.split('').map(s =>
                '<path d="' + segPath[s] + '" class="' + (on.includes(s) ? 'seg-on' : 'seg-off') + '"/>').join('') + '</g>';
        }).join('') + '</svg>';
    }

    // ------------------------------------------------------------------ UI widget
    /* cfg = { source, cells: [{addr, label, input, output, value}], monitor, speed, editable, onStep(info, api), onReset(api), onHalt(api), onAssemble(asm) } */
    function mount(target, cfg) {
        const host = typeof target === 'string' ? document.querySelector(target) : target;
        const root = document.createElement('div');
        root.className = 'cpu8085';
        root.innerHTML =
            '<div class="cpu-toolbar">' +
            '<button class="btn btn-sm" data-a="reset" title="Reload inputs and restart">⏮ Reset</button>' +
            '<button class="btn btn-sm btn-primary" data-a="step" title="Execute one instruction">⏭ Step</button>' +
            '<button class="btn btn-sm" data-a="run">▶ Run</button>' +
            '<button class="btn btn-sm" data-a="end" title="Run to HLT instantly">⏩ Run to end</button>' +
            '<label class="cpu-status" style="display:flex;align-items:center;gap:0.35rem">Speed <input type="range" data-a="speed" min="1" max="20" value="' + (cfg.speed || 4) + '" style="width:90px"></label>' +
            '<span class="spacer"></span><span class="cpu-status" data-r="status">Ready</span></div>' +
            '<div class="cpu-explain" data-r="explain">Press <b>⏭ Step</b> to execute the first instruction, or <b>⏩ Run to end</b> to see the result.</div>' +
            '<div class="cpu-grid"><div class="cpu-listing"><table><thead><tr><th>Label</th><th>Address</th><th>Mnemonics</th><th>Opcode</th><th>Comments</th></tr></thead><tbody data-r="listing"></tbody></table></div>' +
            '<div class="cpu-side">' +
            '<div class="cpu-kit"><div class="kit-label"><span>Address</span><span>Data</span></div><div class="kit-digits"><span data-r="kitA"></span><span data-r="kitD"></span></div></div>' +
            '<div class="cpu-regs" data-r="regs"></div>' +
            '<div class="cpu-flags" data-r="flags"></div>' +
            '<div class="cpu-mem"><table><thead><tr><th>Address</th><th>Data</th><th></th></tr></thead><tbody data-r="mem"></tbody></table></div>' +
            '</div></div>' +
            (cfg.editable ? '<details class="cpu-edit"><summary>✍️ Edit the program and run your own version</summary><textarea data-r="src" spellcheck="false"></textarea><div class="btn-row" style="margin-top:0.4rem"><button class="btn btn-sm btn-primary" data-a="assemble">Assemble &amp; load</button><button class="btn btn-sm" data-a="restore">Restore original</button></div><div class="errs" data-r="errs"></div></details>' : '');
        host.appendChild(root);
        const R = (k) => root.querySelector('[data-r="' + k + '"]');

        const m = new Machine({ monitor: cfg.monitor });
        let asm = null, source = cfg.source, timer = null, lastInfo = null;
        const cells = (cfg.cells || []).map(c => Object.assign({}, c, { initial: c.value === undefined ? 0 : c.value }));
        const api = { machine: m, root, get asm() { return asm; }, cells };

        function buildListing() {
            R('listing').innerHTML = asm.lines.filter(L => L.kind === 'code' || L.kind === 'data' || (L.kind === 'label')).map(L => {
                const ops = L.operands.join(',');
                return '<tr data-addr="' + L.addr + '"><td class="lbl">' + (L.label || '') + '</td><td class="addr">' + (L.kind === 'label' ? '' : h4(L.addr)) +
                    '</td><td class="mn">' + (L.mnem + (ops ? ' ' + ops : '')) + '</td><td class="op">' + (L.bytes || []).map(h2).join(', ') + '</td><td class="cm">' + escapeHTML(L.comment) + '</td></tr>';
            }).join('');
        }
        function loadProgram(src) {
            const a = assemble(src);
            if (a.errors.length) return a;
            asm = a; source = src;
            m.mem.fill(0);
            m.load(asm);
            buildListing();
            if (cfg.onAssemble) cfg.onAssemble(asm, api);
            return a;
        }
        function applyCells() { cells.forEach(c => { m.mem[c.addr] = c.initial & 0xFF; }); cells.forEach(c => { c.written = false; }); }
        function reset(silent) {
            pause();
            m.mem.fill(0); m.load(asm); applyCells();
            m.reset(cfg.start !== undefined ? cfg.start : asm.start);
            lastInfo = null;
            R('explain').innerHTML = 'Inputs loaded. Press <b>⏭ Step</b> to execute the first instruction, or <b>⏩ Run to end</b>.';
            render(null);
            if (cfg.onReset && silent !== true) cfg.onReset(api);
        }
        function regBox(name, val, digits, prev, wide) {
            const changed = prev !== undefined && prev !== val;
            return '<div class="cpu-reg' + (wide ? ' wide' : '') + (changed ? ' flash' : '') + '" title="' + (digits === 2 ? bin8(val) : '') + '"><span class="rn">' + name + '</span><span class="rv">' + (digits === 2 ? h2(val) : h4(val)) + '</span></div>';
        }
        function render(info) {
            const p = info ? info.before : undefined;
            R('regs').innerHTML = regBox('A', m.A, 2, p && p.A) + regBox('Flags', m.flagsByte(), 2, p && undefined) +
                regBox('B', m.B, 2, p && p.B) + regBox('C', m.C, 2, p && p.C) + regBox('D', m.D, 2, p && p.D) + regBox('E', m.E, 2, p && p.E) +
                regBox('H', m.H, 2, p && p.H) + regBox('L', m.L, 2, p && p.L) + regBox('SP', m.SP, 4, p && p.SP) + regBox('PC', m.PC, 4, p && p.PC);
            R('flags').innerHTML = ['S', 'Z', 'AC', 'P', 'CY'].map(f => '<div class="cpu-flag' + (m.F[f] ? ' set' : '') + (p && p.F[f] !== m.F[f] ? ' flash' : '') + '" title="' + ({ S: 'Sign', Z: 'Zero', AC: 'Auxiliary carry', P: 'Parity', CY: 'Carry' }[f]) + '"><div class="fn">' + f + '</div><div class="fv">' + m.F[f] + '</div></div>').join('');
            const reads = info ? info.reads : [], writes = info ? info.writes : [];
            cells.forEach(c => { if (writes.includes(c.addr)) c.written = true; });
            R('mem').innerHTML = cells.map((c, i) => {
                const cl = (writes.includes(c.addr) ? 'wr' : reads.includes(c.addr) ? 'rd' : '');
                const tag = c.input ? '<span class="io-tag io-in">IN</span> ' : c.output ? '<span class="io-tag io-out">OUT</span> ' : '';
                const running = m.steps > 0 && !m.halted;
                const valCell = c.input && m.steps === 0
                    ? '<input maxlength="2" value="' + h2(c.initial) + '" data-cell="' + i + '" aria-label="Data at ' + h4(c.addr) + 'H">'
                    : (c.output && !c.written && !c.input ? '<span style="color:#B0B0B8">--</span>' : h2(m.mem[c.addr]));
                return '<tr class="' + cl + '"><td class="addr">' + h4(c.addr) + '</td><td class="val">' + valCell + '</td><td class="lab">' + tag + (c.label || '') + (running && c.input ? '' : '') + '</td></tr>';
            }).join('');
            root.querySelectorAll('.cpu-listing tr').forEach(tr => tr.classList.remove('cur', 'hit'));
            const cur = root.querySelector('.cpu-listing tr[data-addr="' + m.PC + '"]');
            if (cur && !m.halted) { cur.classList.add('cur'); scrollIntoViewIfNeeded(cur); }
            if (info) { const done = root.querySelector('.cpu-listing tr[data-addr="' + info.pc + '"]'); if (done && (m.halted || done !== cur)) done.classList.add('hit'); }
            const st = R('status');
            st.className = 'cpu-status' + (m.error ? ' error' : m.halted ? ' halted' : '');
            st.textContent = m.error ? 'Stopped' : m.halted ? 'Halted ✓ · ' + m.steps + ' instructions' : (m.steps ? m.steps + ' instructions executed' : 'Ready');
            // kit display: address = PC while running, else first output
            let ka = m.PC, kd = m.mem[m.PC];
            if (m.halted) {
                const out = cells.find(c => c.output && c.written) || cells.find(c => c.output);
                if (out) { ka = out.addr; kd = m.mem[out.addr]; }
            }
            R('kitA').innerHTML = sevenSeg(h4(ka));
            R('kitD').innerHTML = sevenSeg(h2(kd));
        }
        function scrollIntoViewIfNeeded(tr) {
            const box = tr.closest('.cpu-listing');
            const top = tr.offsetTop, bottom = top + tr.offsetHeight;
            if (top < box.scrollTop + 26 || bottom > box.scrollTop + box.clientHeight) box.scrollTop = Math.max(0, top - box.clientHeight / 2);
        }
        function step() {
            if (m.halted) return null;
            const info = m.step();
            lastInfo = info;
            if (m.steps > (cfg.maxSteps || 100000) && !m.halted) { m.halted = true; m.error = 'The program did not reach HLT after ' + m.steps + ' instructions.'; }
            R('explain').innerHTML = '<b>' + h4(info.pc) + 'H &nbsp;' + escapeHTML(info.mn || '') + '</b> — ' + info.text + (m.error && info.text !== m.error ? ' <br><b style="color:#C62828">' + m.error + '</b>' + (cfg.stuckHint ? ' ' + cfg.stuckHint : '') : '');
            render(info);
            if (cfg.onStep) cfg.onStep(info, api);
            if (m.halted) { pause(); if (cfg.onHalt) cfg.onHalt(api); }
            return info;
        }
        function run() {
            if (m.halted) reset();
            pause();
            const speed = Number(root.querySelector('[data-a="speed"]').value);
            timer = setInterval(() => { if (!step()) pause(); }, 1000 / speed);
            root.querySelector('[data-a="run"]').textContent = '⏸ Pause';
        }
        function pause() { if (timer) clearInterval(timer); timer = null; const b = root.querySelector('[data-a="run"]'); if (b) b.textContent = '▶ Run'; }
        function runToEnd() {
            if (m.halted) reset();
            pause();
            const max = cfg.maxSteps || 100000;
            let info = null, guard = 0;
            while (!m.halted && guard < max) { info = m.step(); guard++; if (cfg.onStep && cfg.stepHookOnRun) cfg.onStep(info, api); }
            if (!m.halted) { m.halted = true; m.error = 'The program did not reach HLT after ' + m.steps + ' instructions.'; }
            R('explain').innerHTML = m.error ? '<b style="color:#C62828">' + m.error + '</b>' + (cfg.stuckHint ? ' ' + cfg.stuckHint : '') : 'Program finished in <b>' + m.steps + '</b> instructions. The output locations are highlighted.';
            cells.forEach(c => { if (c.output) c.written = true; });
            render(info);
            if (cfg.onStep && info && !cfg.stepHookOnRun) cfg.onStep(info, api);
            if (cfg.onHalt) cfg.onHalt(api);
        }

        root.addEventListener('click', e => {
            const b = e.target.closest('button[data-a]');
            if (!b) return;
            const a = b.dataset.a;
            if (a === 'reset') reset();
            else if (a === 'step') { pause(); step(); }
            else if (a === 'run') { if (timer) pause(); else run(); }
            else if (a === 'end') runToEnd();
            else if (a === 'assemble') {
                const res = loadProgram(R('src').value);
                R('errs').textContent = res.errors.length ? res.errors.join('\n') : '';
                if (!res.errors.length) reset();
            } else if (a === 'restore') { R('src').value = cfg.source; loadProgram(cfg.source); R('errs').textContent = ''; reset(); }
        });
        root.addEventListener('change', e => {
            const inp = e.target.closest('input[data-cell]');
            if (!inp) return;
            const v = inp.value.trim().toUpperCase();
            if (!/^[0-9A-F]{1,2}$/.test(v)) { inp.classList.add('bad'); return; }
            inp.classList.remove('bad');
            cells[Number(inp.dataset.cell)].initial = parseInt(v, 16);
            reset();
        });
        root.querySelector('[data-a="speed"]').addEventListener('input', () => { if (timer) run(); });

        const res = loadProgram(cfg.source);
        if (res.errors.length) { R('explain').innerHTML = '<b style="color:#C62828">Program error:</b> ' + escapeHTML(res.errors.join('; ')); return api; }
        if (cfg.editable) R('src').value = cfg.source;
        reset(true); // no callbacks yet: the page has not received the api object

        Object.assign(api, {
            reset, step, run, pause, runToEnd,
            setInputs(values) { Object.keys(values).forEach(a => { const c = cells.find(x => x.addr === Number(a)); if (c) c.initial = values[a]; }); reset(); },
            setCells(list) { cells.length = 0; list.forEach(c => cells.push(Object.assign({}, c, { initial: c.value === undefined ? 0 : c.value }))); reset(); },
            setSource(src) { cfg.source = src; const r = loadProgram(src); if (!r.errors.length) { if (cfg.editable) R('src').value = src; reset(); } return r; },
            mem: (a) => m.mem[a],
            get lastInfo() { return lastInfo; },
        });
        return api;
    }

    function escapeHTML(s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

    /* Exam-format program table (static) for the record sheet. */
    function listingHTML(asm, o) {
        o = o || {};
        const rows = asm.lines.filter(L => L.kind === 'code' || L.kind === 'data').map(L => {
            const ops = L.operands.join(',');
            return '<tr><td class="mono">' + (L.label || '') + '</td><td class="mono">' + h4(L.addr) + '</td><td class="mono l">' + L.mnem + (ops ? ' ' + ops : '') +
                '</td><td class="mono">' + (L.bytes || []).map(h2).join(', ') + '</td><td class="l">' + escapeHTML(L.comment) + '</td></tr>';
        }).join('');
        return '<div class="table-wrap"><table class="obs prog-table"><thead><tr><th>Label</th><th>Address</th><th>Mnemonics</th><th>Opcode</th><th>Comments</th></tr></thead><tbody>' + rows + '</tbody></table></div>';
    }

    global.CPU8085 = { assemble, Machine, run, mount, listingHTML, parseNum, h2, h4, bin8, sevenSeg, mnemonicSize };
})(typeof window !== 'undefined' ? window : this);
