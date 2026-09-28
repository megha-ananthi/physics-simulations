/* Headless tests for cpu8085.js + programs8085.js.
   Run from the repo root:
     /System/Library/Frameworks/JavaScriptCore.framework/Versions/Current/Helpers/jsc \
       experiments/msc/assets/cpu8085.js experiments/msc/assets/programs8085.js experiments/msc/assets/cpu8085.test.js
   or open experiments/msc/tests.html in a browser. */
(function (global) {
    'use strict';
    const out = typeof print === 'function' ? print : (s) => console.log(s);
    const { assemble, run, h2, h4 } = global.CPU8085;
    const P = global.PROGRAMS8085;
    let pass = 0, fail = 0;
    const ok = (cond, msg) => { if (cond) pass++; else { fail++; out('FAIL: ' + msg); } };

    // 1. Every sample from the manual / record gives the expected output.
    Object.keys(P).forEach(key => {
        const prog = P[key];
        (prog.samples || []).forEach(s => {
            const m = run(prog.source, s.inputs, { monitor: prog.monitor });
            ok(!m.error, key + ' / ' + s.name + ': ' + m.error);
            Object.keys(s.expect).forEach(a => {
                const got = m.mem[Number(a)], want = s.expect[a];
                ok(got === want, key + ' / ' + s.name + ': M[' + h4(Number(a)) + '] = ' + h2(got) + ', expected ' + h2(want));
            });
        });
    });

    // 2. Addresses and bytes match the printed listings (with the known corrections).
    const at = (asm, label) => asm.symbols[label];
    const bytesAt = (asm, addr) => { const L = asm.byAddr[addr]; return L ? L.bytes.map(h2).join(' ') : '(none)'; };
    const sort = assemble(P.sortAsc.source);
    ok(at(sort, 'NEXTBYT') === 0x8015, 'sort: NEXTBYT at 8015H');
    ok(bytesAt(sort, 0x800B) === 'DA 15 80', 'sort: JC NEXTBYT = DA 15 80, got ' + bytesAt(sort, 0x800B));
    ok(bytesAt(sort, 0x801B) === 'DA 00 80', 'sort: JC START = DA 00 80');
    ok(sort.code[sort.code.length - 1].addr === 0x801E, 'sort: HLT at 801EH');
    const sortD = assemble(P.sortDesc.source);
    ok(bytesAt(sortD, 0x800B) === 'D2 15 80', 'sortDesc: JNC NEXTBYT = D2 15 80');
    const div = assemble(P.div8.source);
    [[0x8000, '3A 50 81'], [0x8003, '47'], [0x8004, '3A 51 81'], [0x8007, '0E 00'], [0x8009, 'B8'], [0x800A, 'DA 13 80'],
     [0x800D, '90'], [0x800E, '0C'], [0x800F, 'B8'], [0x8010, 'D2 0D 80'], [0x8013, '32 52 81'], [0x8016, '79'],
     [0x8017, '32 53 81'], [0x801A, 'CD 80 13'], [0x801D, '76']].forEach(([a, b]) =>
        ok(bytesAt(div, a) === b, 'div8 record listing ' + h4(a) + ': ' + bytesAt(div, a) + ' expected ' + b));
    const h2a = assemble(P.hexToAscii.source);
    ok(at(h2a, 'SUB') === 0x411A && at(h2a, 'SKP') === 0x4121, 'hexToAscii: SUB at 411AH, SKP at 4121H');
    ok(assemble(P.decToHex.source).code.slice(-1)[0].addr === 0x4113, 'decToHex: HLT at 4113H');
    ok(assemble(P.hexToDec.source).code.slice(-1)[0].addr === 0x411F, 'hexToDec: HLT at 411FH');
    ok(assemble(P.asciiToHex.source).code.slice(-1)[0].addr === 0x410F, 'asciiToHex: HLT at 410FH');
    const s2 = assemble(P.sumTwo.source);
    ok(bytesAt(s2, 0x4108) === 'D2 0C 41' && s2.code.slice(-1)[0].addr === 0x4110, 'sumTwo: JNC L1 at 4108H, HLT at 4110H');

    // 3. Hand-verified opcodes.
    const OPC = {
        'MOV A,C': '79', 'MOV M,A': '77', 'MOV B,M': '46', 'MOV M,B': '70', 'MOV A,D': '7A', 'MOV C,M': '4E', 'MOV A,M': '7E',
        'MOV B,A': '47', 'MOV D,A': '57', 'MOV A,B': '78', 'MOV M,C': '71', 'MOV E,L': '5D', 'MVI C,0D': '0E 0D', 'MVI D,01': '16 01',
        'MVI M,55': '36 55', 'LXI H,8040': '21 40 80', 'LXI D,FFFF': '11 FF FF', 'LXI SP,FFF0': '31 F0 FF', 'ADD M': '86', 'ADD B': '80',
        'ADC C': '89', 'SUB B': '90', 'SBB M': '9E', 'ANA A': 'A7', 'XRA A': 'AF', 'ORA E': 'B3', 'CMP M': 'BE', 'CMP B': 'B8',
        'ADI 01': 'C6 01', 'ACI 00': 'CE 00', 'SUI 30': 'D6 30', 'SBI 01': 'DE 01', 'ANI 0F': 'E6 0F', 'XRI FF': 'EE FF', 'ORI 80': 'F6 80',
        'CPI 0A': 'FE 0A', 'INR A': '3C', 'INR C': '0C', 'INR M': '34', 'DCR C': '0D', 'DCR M': '35', 'INX H': '23', 'DCX H': '2B',
        'INX SP': '33', 'DCX D': '1B', 'DAD B': '09', 'DAD SP': '39', 'LDAX B': '0A', 'STAX D': '12', 'LDA 4200': '3A 00 42',
        'STA 8153': '32 53 81', 'LHLD 2050': '2A 50 20', 'SHLD 2050': '22 50 20', 'RLC': '07', 'RRC': '0F', 'RAL': '17', 'RAR': '1F',
        'DAA': '27', 'CMA': '2F', 'STC': '37', 'CMC': '3F', 'HLT': '76', 'NOP': '00', 'JMP 8000': 'C3 00 80', 'JC 8015': 'DA 15 80',
        'JNC 800D': 'D2 0D 80', 'JZ 1234': 'CA 34 12', 'JNZ 8008': 'C2 08 80', 'JP 1234': 'F2 34 12', 'JM 1234': 'FA 34 12',
        'JPE 1234': 'EA 34 12', 'JPO 1234': 'E2 34 12', 'CALL 1380': 'CD 80 13', 'CC 1234': 'DC 34 12', 'CNZ 1234': 'C4 34 12',
        'RET': 'C9', 'RZ': 'C8', 'RNC': 'D0', 'PUSH B': 'C5', 'PUSH PSW': 'F5', 'POP H': 'E1', 'POP PSW': 'F1', 'XCHG': 'EB',
        'XTHL': 'E3', 'PCHL': 'E9', 'SPHL': 'F9', 'OUT 03': 'D3 03', 'IN 01': 'DB 01', 'RST 1': 'CF', 'RST 7': 'FF', 'EI': 'FB', 'DI': 'F3',
    };
    Object.keys(OPC).forEach(ins => {
        const a = assemble('        ' + ins);
        const got = a.errors.length ? a.errors.join(';') : a.code[0].bytes.map(h2).join(' ');
        ok(got === OPC[ins], 'opcode ' + ins + ' = ' + got + ', expected ' + OPC[ins]);
    });

    // 4. Flag behaviour that the practicals depend on.
    const flags = (src, mem) => run(src + '\n        HLT', mem || {});
    let m = flags('        MVI A,05\n        CPI 06');
    ok(m.F.CY === 1 && m.F.Z === 0 && m.A === 0x05, 'CMP: A < operand sets CY, keeps A');
    m = flags('        MVI A,06\n        CPI 06');
    ok(m.F.CY === 0 && m.F.Z === 1, 'CMP: equal sets Z, clears CY');
    m = flags('        MVI A,99\n        ADI 01\n        DAA');
    ok(m.A === 0x00 && m.F.CY === 1, 'DAA: 99 + 1 = 00 with carry');
    m = flags('        MVI A,09\n        ADI 01\n        DAA');
    ok(m.A === 0x10 && m.F.CY === 0, 'DAA: 09 + 1 = 10');
    m = flags('        MVI A,38\n        ADI 45\n        DAA');
    ok(m.A === 0x83, 'DAA: 38 + 45 = 83');
    m = flags('        MVI A,01\n        RRC');
    ok(m.A === 0x80 && m.F.CY === 1, 'RRC moves D0 into CY');
    m = flags('        MVI C,01\n        DCR C');
    ok(m.C === 0 && m.F.Z === 1, 'DCR sets Z when the result is zero');
    m = flags('        STC\n        MVI C,FF\n        INR C');
    ok(m.F.CY === 1, 'INR does not affect CY');
    m = flags('        MVI A,23\n        SUI 45');
    ok(m.A === 0xDE && m.F.CY === 1 && m.F.S === 1, 'SUB with borrow: 23 − 45 = DE, CY = 1');
    m = flags('        LXI SP,FFF0\n        MVI B,12\n        PUSH B\n        POP D');
    ok(m.D === 0x12 && m.SP === 0xFFF0, 'PUSH/POP round trip');

    // 5. Equal numbers make the manual's ascending sort loop forever (documented in the notes).
    m = run(P.sortAsc.source, { 0x8040: 3, 0x8041: 5, 0x8042: 5, 0x8043: 1 }, { maxSteps: 5000 });
    ok(!m.halted, 'sortAsc with equal numbers does not terminate (known manual limitation)');

    out((fail ? 'FAILED ' : 'ALL PASSED ') + pass + ' passed, ' + fail + ' failed');
    global.CPU8085_TEST_RESULT = { pass, fail };
})(typeof window !== 'undefined' ? window : this);
