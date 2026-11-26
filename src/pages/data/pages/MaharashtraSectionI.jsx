import { useEffect, useState } from "react";
import { NumericInput } from "../components/WorkbookInputTable";
import sheets from "../schemas/mhSectionI.json";
import { getToken } from "../../../utils/auth";

import nuclearRows from "../schemas/mhSectionII.json";

import hydroRows from "../schemas/mhSectionIII.json";

import solarRows from "../schemas/mhSectionIVa.json";

import cspRows from "../schemas/mhSectionIVb.json";

import transferSheets from "../schemas/mhSectionXVII.json";
import fossilFuelSheets from "../schemas/mhSectionXV.json";
import agricultureBlocks from "../schemas/mhSectionXIV.json";
import cookingBlocks from "../schemas/mhSectionXIII.json";
import passengerBlocks from "../schemas/mhSectionXIIa.json";
import freightBlocks from "../schemas/mhSectionXIIb.json";
import industryBlocks from "../schemas/mhSectionXI.json";
import residentialBlocks from "../schemas/mhSectionXa.json";
import commercialBlocks from "../schemas/mhSectionXb.json";
import hydrogenBlocks from "../schemas/mhSectionVIII.json";
import storageBlocks from "../schemas/mhSectionVIIc.json";
import lossBlocks from "../schemas/mhSectionVIIb.json";
import tradeBlocks from "../schemas/mhSectionVIIa.json";
import wasteBlocks from "../schemas/mhSectionVI.json";
import algaeBlocks from "../schemas/mhSectionVc.json";
import biofuelRows from "../schemas/mhSectionVb.json";
import biomassRows from "../schemas/mhSectionVa.json";
import distributedSolarRows from "../schemas/mhSectionIVe.json";
import smallHydroRows from "../schemas/mhSectionIVd.json";
import offshoreRows from "../schemas/mhSectionIVc2.json";
import onshoreRows from "../schemas/mhSectionIVc1.json";

const sectionITabs = Object.keys(sheets);
const sectionIVTabs = ["IV.a", "IV.b", "IV.c.1", "IV.c.2", "IV.d", "IV.e"];

const sortColumns = (a,b) => a.length - b.length || a.localeCompare(b);

function buildPowerStationBlocks(rows, sheet) {
  const byRow = new Map(rows.map(row => [row.r, row]));
  const blocks = [];
  function section(row) {
    blocks.push({start:row, title:(byRow.get(row).c.B || byRow.get(row).c.C)[1], rows:[]});
  }
  function table(titleRow, headerRow, first, last, limitYears = true, captionColumn) {
    const cells = byRow.get(titleRow).c;
    const titleColumn = captionColumn || (cells.B ? "B" : "C");
    const header = {...byRow.get(headerRow)?.c};
    if (headerRow === titleRow || (sheet === "I.c" && headerRow === 526)) delete header[titleColumn];
    if (sheet === "I.b") {
      if ([288,321,354].includes(headerRow)) delete header.C;
      if (headerRow === 72) delete header.C;
      if (headerRow === 265) delete header.G;
      if (headerRow === 281) header.C = cells.C;
    }
    if (["III","IV.a","IV.c.1"].includes(sheet) && titleRow === 11) {
      header.I = byRow.get(12).c.I;
    }
    if (sheet === "III" && titleRow === 84) {
      header.C = header.D;
      delete header.D;
    }
    if (sheet === "V.a") {
      if (titleRow === 16) {
        header.D = ["text", "Installed Capacity (MW)"];
        header.F = ["text", "Generation (GWh)"];
      }
      for (const col of Object.keys(header)) {
        if (/^Column\d+$/.test(header[col][1])) delete header[col];
      }
    }
    const data = rows.filter(row => row.r >= first && row.r <= last && row.r !== headerRow);
    const columns = [...new Set([...Object.keys(header), ...data.flatMap(row => Object.keys(row.c))])]
      .filter(col => !(sheet === "IV.c.1" && first === last && first === titleRow && col === titleColumn))
      // G80 repeats the PLF row label from C80.
      .filter(col => !(sheet === "I.b" && titleRow === 78 && col === "G"))
      .filter(col => !limitYears || (col.length === 1 && col <= "T")).sort(sortColumns);
    const unitCell = cells.U?.[0] === "text" ? cells.U : byRow.get(titleRow+1)?.c.U;
    blocks.push({start:titleRow, title:cells[titleColumn][1], header, columns, rows:data,
      unit:sheet === "IV.b" && titleRow === 12 ? cells.D[1] : ["III","IV.a","IV.c.1","IV.e"].includes(sheet) && titleRow === 11 ? cells.D[1] : unitCell?.[0] === "text" && (!["I.c","III","IV.a","IV.b","IV.c.1","IV.c.2","IV.d","IV.e","V.a","V.b"].includes(sheet) || /[a-z%]/i.test(unitCell[1])) ? unitCell[1] : ""});
  }
  if (sheet === "V.b") {
    // V.b uses column U for 2070. Its schema excludes the repeated target year in V.
    table(11,11,12,19,false,"D");
    const history = blocks[blocks.length - 1];
    history.title = "Ethanol and biodiesel production";
    history.header.D = byRow.get(11).c.D;
    table(22,null,22,24,false,"D");
    blocks[blocks.length - 1].title = "";
    table(30,31,32,34,false);
    section(37);
    table(40,39,40,44,false);
    const ethanol = blocks[blocks.length - 1];
    ethanol.columns = ethanol.columns.filter(col => col !== "B");
    table(47,47,48,52,false);
    table(55,55,56,60,false);
    section(72);
    table(74,null,76,77,false);
    table(79,null,80,81,false);
    table(83,null,85,86,false);
    table(88,89,90,93,false);
    table(97,95,97,99,false);
    blocks[blocks.length - 1].title = "";
    section(101);
    table(103,105,106,107,false);
    blocks[blocks.length - 1].unit = "TWh";
    return blocks;
  }
  if (sheet === "V.a") {
    const layout = [
      [16,16,17,31,"D"], [32,null,32,33], 35, [37,39,40,44], [47,49,50,54],
      [57,59,60,64], [67,69,70,74], [77,null,79,79], 80,
      [83,85,86,88,"C"], [90,92,93,95,"C"], [98,100,101,103,"C"],
      [106,null,108,108], 112, [118,118,120,126],
      [129,129,130,132], [135,135,136,138], 140, [142,142,143,145],
      147, [148,148,149,151], [154,154,155,157], [160,161,162,162],
      [165,166,167,167], [170,170,171,171], [177,null,179,179,"C"],
      [182,182,184,184], 186, [189,191,192,195], 198, [200,202,203,204],
      206, [208,210,211,212], [216,218,219,224],
      [228,230,231,260], 262, [264,230,265,275], [277,230,278,280],
      [282,281,282,285], [287,287,288,294], [298,298,299,314]
    ];
    for (const entry of layout) {
      if (Array.isArray(entry)) {
        const [caption, header, first, last, column] = entry;
        table(caption, header, first, last, caption < 228, column);
      } else section(entry);
    }
    return blocks;
  }
  if (sheet === "IV.e") {
    const layout = [
      [11,13,14,30], 33, [34,null,35,37], [40,42,43,47], [51,53,54,58],
      [63,65,66,70], [73,75,76,80], [82,84,85,89], [93,95,96,100],
      105, [107,109,110,111], 114, [116,118,119,121], [123,125,126,128],
      131, [133,135,136,136], 139, [141,141,143,151], [153,153,154,156],
      [159,159,160,162], 164, 165, [166,166,167,169],
      [172,173,174,174], [177,178,179,179], [182,182,183,183], [187,135,187,187],
      190, [192,194,195,198], 201, [203,205,206,207], 210, [212,214,215,220],
      [223,225,226,250], 252, [254,225,255,264], [266,225,267,268],
      [270,269,270,273], [275,275,276,280], [284,284,285,298]
    ];
    for (const entry of layout) {
      if (Array.isArray(entry)) table(...entry, entry[0] < 223);
      else section(entry);
    }
    return blocks;
  }
  if (sheet === "IV.d") {
    const layout = [
      28, [30,32,33,37], [41,43,44,48], [52,54,55,59],
      [62,62,63,63], 65, [67,69,70,71], 74, [76,78,79,81], [84,85,86,88],
      90, [92,94,95,95], 98, [101,101,103,108], [110,110,111,113],
      [116,116,117,119], 122, 123, [124,124,125,127], [130,94,130,130],
      [132,133,134,134], [137,138,139,139], [142,142,143,143], [148,94,148,148],
      151, [153,155,156,158], 161, [163,165,166,167], 170, [172,174,175,180],
      [183,185,186,210], 212, [214,185,215,224], [226,185,227,228],
      [230,229,230,233], [235,235,236,240], [244,244,245,258]
    ];
    for (const entry of layout) {
      if (Array.isArray(entry)) table(...entry, entry[0] < 183);
      else section(entry);
    }
    return blocks;
  }
  if (sheet === "IV.c.2") {
    const layout = [
      13, [19,21,22,26], [29,29,30,30], 32, [34,36,37,38],
      41, [43,45,46,48], [50,52,53,55], 58,
      [61,61,63,68], [70,70,71,73], [76,76,77,79], 81, 82, [83,83,84,86],
      [91,92,93,93], [96,97,98,98], [101,101,102,102],
      108, [110,112,113,115], 118, [120,122,123,123], 126, [128,130,131,136],
      [140,142,143,167], 169, [171,142,172,181], [183,142,184,185],
      [187,186,187,190], [192,192,193,197], [201,201,202,215]
    ];
    for (const entry of layout) {
      if (Array.isArray(entry)) table(...entry, entry[0] < 140);
      else section(entry);
    }
    return blocks;
  }
  if (sheet === "IV.c.1") {
    const layout = [
      [11,13,14,32], 35, [37,null,37,37], [39,41,42,46], [50,52,53,57],
      [61,63,64,68], [72,74,75,79], 85, [87,89,90,91], 94,
      [96,98,99,101], [104,105,106,108], 110, [112,114,115,115],
      118, [121,121,123,130], [132,132,133,135], [138,138,139,141],
      143, 144, [145,145,146,148], [153,154,155,155], [158,159,160,160],
      [163,163,165,165], [169,114,169,169], 172, [174,176,177,180],
      183, [185,187,188,189], 192, [194,196,197,202], [208,210,211,235],
      237, [239,210,240,249], [251,210,252,253], [255,254,255,258],
      [260,260,261,265], [269,269,270,283]
    ];
    for (const entry of layout) {
      if (Array.isArray(entry)) table(...entry, entry[0] < 208);
      else section(entry);
    }
    return blocks;
  }
  if (sheet === "IV.b") {
    const layout = [
      [12,14,15,24], 31, [33,35,36,40], [43,45,46,50],
      [53,55,54,60], [65,67,68,72], [76,78,79,83], [86,88,89,93],
      [96,98,99,103], [106,108,109,113], [118,null,120,121],
      [124,126,127,127], [129,null,129,129,"D"], 131, [133,135,136,136],
      [138,140,141,141], [143,145,146,146], 149, [151,153,154,154], 157,
      [159,161,162,164], [166,168,169,171], [173,175,176,178], [180,182,183,185],
      [188,190,191,193], [195,197,198,200], 204, [207,207,209,212,"A"],
      [214,214,215,217], [220,220,221,223], 226, 227, [228,228,229,231],
      [235,135,235,235], [237,238,239,239], [242,243,244,244], [247,247,248,248],
      [252,135,253,253], [255,135,257,257], 260, [262,264,265,267], 270,
      [272,274,275,277], 280, [282,284,285,290], [295,297,298,315],
      [317,297,318,320], [322,297,323,325], [327,297,328,335], [340,340,341,343],
      345, [347,297,348,357], [359,297,360,361], [363,362,363,366],
      [368,368,369,373], [377,377,378,391]
    ];
    for (const entry of layout) {
      if (Array.isArray(entry)) {
        const [caption, header, first, last, column] = entry;
        table(caption, header, first, last, caption < 295, column);
      } else section(entry);
    }
    return blocks;
  }
  if (sheet === "IV.a") {
    const layout = [
      [11,13,14,32], 36, [39,41,42,46], [50,52,53,57], [61,63,64,68],
      [72,74,75,79], [83,85,86,90], [93,95,96,100], [104,106,107,111],
      [114,116,117,121], 125, [127,129,130,133], 137,
      [139,141,142,144], [146,148,149,151], 153, [155,157,158,158],
      161, [164,163,164,165], [168,163,169,171], [174,163,174,174],
      [177,177,179,184], [187,187,188,190], [193,193,194,196],
      198, 199, [200,200,201,203], [207,208,209,209], [212,213,214,214],
      [217,217,218,218], [223,163,223,223], 226, [228,230,231,232],
      235, [237,239,240,241], 244, [246,248,249,254],
      [258,260,261,285], 287, [289,260,290,299], [301,260,302,303],
      [305,304,305,308], [310,310,311,315], [319,319,320,333]
    ];
    for (const entry of layout) {
      if (Array.isArray(entry)) table(...entry, entry[0] < 258);
      else section(entry);
    }
    return blocks;
  }
  if (sheet === "III") {
    const layout = [
      [11,13,14,32], 34, [36,38,39,43], [47,49,50,54], [58,60,61,65],
      [69,71,72,76], 82, [84,86,87,88], 91, [93,95,96,98], [100,102,103,105],
      107, [109,111,112,112], 115, [118,118,120,125], [128,128,129,131],
      [134,134,135,137], 139, 140, [141,141,142,144], [149,111,149,149],
      [151,152,153,153], [156,157,158,158], [161,161,163,163], [167,111,167,167],
      170, [172,174,175,177], 180, [182,184,185,186], 189, [191,193,194,199],
      [204,206,207,222], [224,206,225,229], [231,206,232,236], [239,206,240,243],
      [245,206,246,250], [252,206,253,257], [259,206,260,266], [268,206,269,277],
      279, [281,206,282,292], [294,206,295,297], [301,300,301,304],
      [306,306,307,313], [316,316,317,332]
    ];
    for (const entry of layout) {
      if (Array.isArray(entry)) table(...entry, entry[0] < 204);
      else section(entry);
    }
    return blocks;
  }
  if (sheet === "II") {
    const layout = [
      [10,12,13,31], 35, [39,41,42,46], [49,51,52,55], [58,60,61,64], [67,69,70,74],
      [78,133,79,81], [83,83,84,99], 102, [105,107,108,108], [110,112,113,117],
      [121,123,124,124], 129, [131,133,134,134], 137, [139,141,142,142],
      145, [147,149,150,150], [153,153,154,173], 176, [178,180,181,185],
      188, [190,192,193,196], 199,
      ...[202,210,218,226,234,242,250,258,266,274].map(r => [r,r+2,r+3,r+5]),
      [282,284,285,304], [306,306,307,309], [311,311,312,314], 316,
      [318,318,319,321], [324,324,325,327], [330,330,331,333],
      [336,337,338,338], [341,342,343,343], [346,347,348,348],
      351, [353,355,356,364], [370,372,373,388], [390,372,391,395],
      [397,372,398,402], [405,372,406,409], [411,372,412,416],
      [418,372,419,423], [425,372,426,432], [434,372,435,443],
      445, [447,372,448,458], [460,372,461,463], [467,466,467,470],
      [472,472,473,479], [482,482,483,498]
    ];
    for (const entry of layout) {
      if (Array.isArray(entry)) table(...entry, entry[0] < 370);
      else section(entry);
    }
    return blocks;
  }
  if (sheet === "I.c") {
    const layout = [
      12, [14,16,17,20], [23,25,26,29], [32,33,34,37], [40,40,41,41],
      [44,46,47,50], [53,55,56,57],
      60, [62,63,64,66], [69,70,71,73], [76,77,78,80], [83,84,85,87],
      [90,91,92,94], [96,97,98,100],
      105, [107,109,110,112], [114,116,117,119], [121,123,124,126], [128,130,131,133],
      138, [141,143,144,144],
      151, [153,154,155,157], [159,160,161,164], [166,167,168,168],
      172, [174,176,177,194,"D"], [196,198,199,217,"D"], [219,221,222,243,"D"],
      245, [246,246,247,249], [251,251,252,254], [256,256,257,259], [261,261,262,264],
      [267,268,269,269], [272,273,274,274], [277,278,279,279],
      282, [284,286,287,292], 296, [298,300,301,305],
      310, [312,314,315,317], 320, [322,324,325,330], 336
    ];
    for (const entry of layout) {
      if (!Array.isArray(entry)) {
        section(entry);
        continue;
      }
      const [caption, header, first, last, column] = entry;
      table(caption, header, first, last, true, column);
    }
    // The gas cost model repeats the coal model 104 worksheet rows lower.
    for (const offset of [0, 104]) {
      const ranges = [
        [339,340,341,359], [362,361,362,362], [364,361,365,366], [368,361,369,370],
        [372,361,373,374], [376,361,377,383], [388,361,389,399], [401,361,402,404],
        [406,405,406,409], [411,411,412,418], [422,422,423,438]
      ];
      for (const range of ranges) {
        if (range[0] === 388) section(386 + offset);
        table(...range.map(row => row + offset), false);
      }
    }
    table(546,526,546,546,false);
    return blocks;
  }
  if (sheet === "I.b") {
    // Coal worksheet ranges are [caption, column headings, first data row, last data row].
    // A single row number denotes a section heading.
    const layout = [
      [13,15,16,63], [66,67,68,69], 70, [72,72,73,73], [75,72,75,75], [78,78,79,80],
      [82,84,85,86], [89,92,93,96], 108,
      [110,112,113,117], [120,122,123,127], [130,132,133,137], [139,141,142,146],
      [148,150,151,155], [169,171,172,176], [179,181,182,186], [189,191,192,196],
      201, [203,204,205,205], [207,209,210,210], [214,214,215,218],
      221, 223, [224,224,225,228], [230,230,231,234], [236,236,237,240],
      242, [243,243,244,247], [250,250,251,254], [257,257,258,261], [264,265,266,268],
      271, [273,275,276,276], [279,281,282,285],
      287, [288,288,289,303], [305,288,306,319],
      321, [322,321,323,327], [329,321,330,334], [336,321,337,341],
      [343,343,344,346], [349,349,350,352], 354, [355,354,356,358], 361,
      [362,362,363,366], [368,368,369,372], [374,374,375,378], [380,380,381,383],
      [386,387,388,388], [391,392,393,393], [396,397,398,398], [402,288,403,405],
      [407,407,408,410], [414,288,414,414], [416,288,417,419],
      [423,424,425,429], [431,432,433,436], [438,439,440,443],
      445, [447,448,449,454], 456, [458,459,460,463],
      [471,473,474,489], [491,473,492,496], [498,473,499,503], [506,473,507,510],
      [512,473,513,517], [519,473,520,524], [526,473,527,533], [535,473,536,544],
      546, [548,473,549,559], [561,473,562,564], [568,567,568,571],
      [573,573,574,580], [583,583,584,599]
    ];
    for (const entry of layout) {
      if (Array.isArray(entry)) table(...entry, entry[0] < 471);
      else section(entry);
    }
    return blocks;
  }
  // Each range maps the worksheet caption, header, first and last data row.
  const groups = [
    [35, [[38,40,41,44],[49,52,53,56],[61,63,64,67],[72,74,75,78],[83,83,84,84]]],
    [87, [[89,91,92,95],[99,101,102,105]]],
    [109, [[111,113,114,116],[118,120,121,123],[125,126,127,129],[131,132,133,135]]],
    [138, [[140,142,143,145]]], [148, [[150,152,153,153]]],
    [156, [[158,160,161,161],[164,164,165,171],[174,173,175,177]]],
    [179, [[181,173,182,184]]],
    [186, [[187,187,188,190],[193,193,194,196],[198,198,199,201],[204,204,205,207],
      [211,212,213,213],[216,217,218,218],[221,222,223,223],[227,173,228,232],
      [234,null,235,238],[241,173,242,248]]],
    [250, [[252,254,255,258]]], [261, [[263,265,266,268]]],
    [271, [[273,275,276,281]]], [283, [[285,287,288,291]]]
  ];
  for (const [heading,ranges] of groups) {
    section(heading);
    for (const range of ranges) table(...range);
  }
  table(297,299,300,341,false);
  section(343);
  table(345,299,346,356,false);
  table(358,299,359,361,false);
  table(365,364,365,368,false);
  table(370,370,371,377,false);
  table(380,380,381,396,false);
  return blocks;
}
const layouts = Object.fromEntries(sectionITabs.map(tab => [tab, buildPowerStationBlocks(sheets[tab].rows, tab)]));

const renewableSheets = {
  "IV.a": { title: "Solar PV", blocks: buildPowerStationBlocks(solarRows, "IV.a") },
  "IV.b": { title: "Solar CSP", blocks: buildPowerStationBlocks(cspRows, "IV.b") },
  "IV.c.1": { title: "Onshore Wind", blocks: buildPowerStationBlocks(onshoreRows, "IV.c.1") },
  "IV.c.2": { title: "Offshore Wind", blocks: buildPowerStationBlocks(offshoreRows, "IV.c.2") },
  "IV.d": { title: "Small Hydro", blocks: buildPowerStationBlocks(smallHydroRows, "IV.d") },
  "IV.e": { title: "Distributed Solar PV", blocks: buildPowerStationBlocks(distributedSolarRows, "IV.e") }
};
const singleSheets = {
  ...fossilFuelSheets,
  ...transferSheets,
  XIV: { title: "Agriculture", blocks: agricultureBlocks },
  XIII: { tabLabel: "XIII.a", title: "Domestic Cooking", blocks: cookingBlocks },
  "XII.a": { title: "Domestic passenger transport", blocks: passengerBlocks },
  "XII.b": { title: "Domestic freight", blocks: freightBlocks },
  XI: { title: "Industry", blocks: industryBlocks },
  "X.a": { title: "Residential", blocks: residentialBlocks },
  "X.b": { title: "Commercial", blocks: commercialBlocks },
  VIII: { title: "Green Hydrogen", blocks: hydrogenBlocks },
  "VII.c": { title: "Storage", blocks: storageBlocks },
  "VII.b": { title: "T&D Losses", blocks: lossBlocks },
  "VII.a": { title: "Electricity trade", blocks: tradeBlocks },
  VI: { title: "Waste to Electricity", blocks: wasteBlocks },
  "V.c": { title: "3rd Generation Bio Fuels", blocks: algaeBlocks },
  "V.b": { title: "First & Second Generation Bio Fuels", blocks: buildPowerStationBlocks(biofuelRows, "V.b") },
  "V.a": { title: "Biomass Based Electricity", blocks: buildPowerStationBlocks(biomassRows, "V.a") },
  II: { title: "Nuclear power generation", blocks: buildPowerStationBlocks(nuclearRows, "II") },
  III: { title: "Hydro Power Generation (Large Hydro)", blocks: buildPowerStationBlocks(hydroRows, "III") }
};

export default function MaharashtraSectionI({ section = "I" }) {
  const renewable = section === "IV";
  const tabs = singleSheets[section]?.tabLabel ? [section] : renewable ? sectionIVTabs : sectionITabs;
  const enabledTabs = renewable ? Object.keys(renewableSheets) : tabs;
  const singleSheet = singleSheets[section];
  const showTabs = !singleSheet || Boolean(singleSheet.tabLabel);
  const draftKey = "mh-admin:section-" + section.toLowerCase() + ":draft:v1";
  const [tab,setTab] = useState(singleSheet ? section : tabs[0]);
  const title = renewable ? renewableSheets[tab].title : singleSheet?.title ?? sheets[tab].title;
  const blocks = renewable ? renewableSheets[tab].blocks : singleSheet?.blocks ?? layouts[tab];
  const [draft,setDraft] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem(draftKey)) || {}; } catch { return {}; }
  });
  const [notice,setNotice] = useState("");
  const apiSheet = singleSheet?.tabLabel ?? tab.replace(/^IV\.c\.([12])$/, "IV.c$1");
  const isApiSheet = section === "III"
    || (section === "I" && ["I.a", "I.b", "I.c"].includes(tab))
    || section === "IV"
    || ["V.a", "V.b", "V.c", "VI", "VII.a", "VII.b", "VII.c", "VIII", "X.a", "X.b", "XI", "XII.a", "XII.b", "XIII", "XIV", "XV.a", "XV.b", "XV.c", "XVII.a", "XVII.b"].includes(section);
  const [sheetResponse,setSheetResponse] = useState(null);
  const apiValues = sheetResponse?.sheet === apiSheet ? sheetResponse.values : null;
  const [apiError,setApiError] = useState("");
  const [apiAttempt,setApiAttempt] = useState(0);
  useEffect(() => {
    if (!isApiSheet) return undefined;
    let active = true;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    setSheetResponse(null);
    setApiError("");
    const token = getToken();
    fetch(`/api/admin/sheets/${apiSheet}`, {
      method: "GET",
      signal: controller.signal,
      cache: "no-store",
      headers: { Accept: "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }
    }).then(async response => {
      if (!response.ok) throw new Error(`Could not load ${apiSheet} data (HTTP ${response.status}).`);
      const payload = await response.json();
      const responseSheet = String(payload?.sheet || "").replace(/\s/g, "");
      const acceptedSheetNames = [tab, apiSheet, `${apiSheet}-KS`, ...(apiSheet === "III" ? ["III-ND"] : []), ...(apiSheet === "XIII.a" ? ["XIII.a-PB"] : []), ...(apiSheet === "XIV" ? ["XIV-Evelin"] : [])];
      if (!acceptedSheetNames.includes(responseSheet) || !payload.values
        || typeof payload.values !== "object" || Array.isArray(payload.values)) {
        throw new Error(`The server returned an invalid ${apiSheet} response.`);
      }
      const apiRows = singleSheets[section]
        ? singleSheets[section].blocks.flatMap(block => block.rows)
        : section === "IV"
          ? renewableSheets[tab].blocks.flatMap(block => block.rows)
          : sheets[tab].rows;
      const inputTypes = new Map(apiRows.flatMap(row => Object.entries(row.c)
        .filter(([, cell]) => ["number", "percent"].includes(cell[0]))
        .map(([column, [kind]]) => [`${column}${row.r}`, kind])));
      const values = {};
      for (const [address, entry] of Object.entries(payload.values)) {
        const ref = address.replace(/^[^!]+!/, "").replace(/\$/g, "").toUpperCase();
        const kind = inputTypes.get(ref);
        if (!kind) continue;
        let value = entry;
        if (Array.isArray(entry)) {
          if (entry.length !== 2 || entry[0] !== kind) throw new Error(`The server returned an invalid ${apiSheet} value at ${ref}.`);
          value = entry[1];
        } else if (entry && typeof entry === "object") {
          if (Object.prototype.hasOwnProperty.call(entry, "value")) value = entry.value;
          else if (Object.prototype.hasOwnProperty.call(entry, "rawValue")) value = entry.rawValue;
          else throw new Error(`The server returned an invalid ${apiSheet} value at ${ref}.`);
        }
        if (value !== null && value !== undefined && typeof value !== "string"
          && (typeof value !== "number" || !Number.isFinite(value))) {
          throw new Error(`The server returned an invalid ${apiSheet} value at ${ref}.`);
        }
        if (value !== null && value !== undefined && value !== "" && value !== "-"
          && !Number.isFinite(Number(value))) {
          throw new Error(`The server returned an invalid ${apiSheet} value at ${ref}.`);
        }
        values[ref] = value == null ? "" : String(value);
      }
      if (!Object.keys(values).length) throw new Error(`The ${apiSheet} response contained no numeric input values.`);
      return values;
    }).then(values => {
      if (active) setSheetResponse({ sheet: apiSheet, values });
    }).catch(error => {
      if (active) setApiError(error.message || `Could not load ${apiSheet} data. Please try again.`);
    }).finally(() => clearTimeout(timeout));
    return () => { active = false; clearTimeout(timeout); controller.abort(); };
  }, [isApiSheet, apiSheet, section, tab, apiAttempt]);
  const change = (key,value) => { setDraft(prev => ({...prev,[key]:value})); setNotice(""); };
  function save() {
    const invalid = Object.entries(draft).find(([,v]) => String(v).trim() === "" || !Number.isFinite(Number(v)));
    if (invalid) { setNotice("Enter a number for " + invalid[0] + "."); return; }
    try { sessionStorage.setItem(draftKey, JSON.stringify(draft)); setNotice("Section "+section+" draft saved in this tab."); }
    catch { setNotice("Could not save the draft in this tab."); }
  }
  return <div className="space-y-5 pb-3"><div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
    {showTabs && <div role="tablist" aria-label={"Section "+section+" sheets"} className="flex gap-2 overflow-x-auto border-b bg-slate-50 px-4 py-2.5">
      {tabs.map((name,i) => <button key={name} type="button" role="tab" id={"tab-"+name} aria-controls="mh-section-i-panel"
        aria-selected={name===tab} tabIndex={name===tab ? 0 : -1} disabled={!enabledTabs.includes(name)} title={renewable ? renewableSheets[name]?.title : singleSheet?.title ?? sheets[name].title}
        onClick={() => setTab(name)} onKeyDown={e => {
          const count = enabledTabs.length;
          const next = {ArrowRight:(i+1)%count,ArrowLeft:(i+count-1)%count,Home:0,End:count-1}[e.key];
          if(next !== undefined){ e.preventDefault(); setTab(enabledTabs[next]); document.getElementById("tab-"+enabledTabs[next])?.focus(); }
        }} className={"disabled:opacity-50 rounded-lg border px-3 py-1.5 text-xs font-semibold shadow-sm "+(name===tab ? "border-emerald-700 bg-emerald-700 text-white" : "border-slate-300 bg-white text-slate-700")}>{singleSheet?.tabLabel ?? name}</button>)}
    </div>}
    <section key={tab} id="mh-section-i-panel" role={showTabs ? "tabpanel" : undefined} aria-labelledby={showTabs ? "tab-"+tab : undefined} className="space-y-6 p-4 sm:p-6">
        {isApiSheet && <div aria-live="polite">
          {apiError ? <div role="alert" className="text-sm text-red-700">{apiError}
            <button type="button" className="ml-3 underline" onClick={() => setApiAttempt(value => value + 1)}>Retry</button>
          </div> : apiValues === null
            ? <span role="status" className="text-sm text-gray-600">Loading {apiSheet} data from API...</span>
            : <span role="status" className="text-xs font-medium text-emerald-700">Data loaded from API</span>}
        </div>}
      <h2 className="text-base font-bold">{singleSheet?.tabLabel ?? tab} {title}</h2>
      {blocks.map(block => <section key={block.start} className={block.rows.length ? "overflow-hidden rounded-xl border border-gray-200" : ""}>
        {block.title && <h3 className={"text-sm font-semibold "+(block.rows.length ? "border-b px-4 py-4" : "")}>{block.title}{block.unit && <span className="ml-2 text-xs font-normal text-gray-500">{block.unit}</span>}</h3>}
        {block.rows.length > 0 && <div className="overflow-x-auto"><table aria-label={block.title || title} className="w-full border-collapse text-left text-sm">
          {block.header && Object.keys(block.header).length > 0 && <thead className="bg-gray-50 text-xs text-gray-600"><tr>{block.columns.map(col => <th key={col} scope="col" className="whitespace-nowrap px-3 py-2 font-medium">{block.header[col]?.[1]}</th>)}</tr></thead>}<tbody>
          {block.rows.map(row => <tr key={row.r} className="border-b border-gray-100 last:border-0">{block.columns.map(col => {
            const cell = row.c[col];
            const key = tab+"!"+col+row.r;
            const editable = block.header?.[col]?.[1] !== "Trajectory" && cell && (cell[0]==="percent" || cell[0]==="number");
            const apiValue = apiValues?.[`${col}${row.r}`];
            const numericApiValue = Number(apiValue);
            const normalizedApiValue = cell?.[0] === "percent" && apiValue !== undefined && apiValue !== ""
              && apiValue !== "-" && Number.isFinite(numericApiValue)
              ? String(Number((numericApiValue * 100).toPrecision(15))) : apiValue ?? "";
            return <td key={col} className="whitespace-nowrap px-3 py-2">{editable && isApiSheet && apiValues === null ? "-" : editable ?
              <NumericInput definition={{key,label:key,unit:cell[0]==="percent" ? "%" : ""}}
                value={String(draft[key] ?? (isApiSheet ? normalizedApiValue : cell[1]))}
                placeholder={isApiSheet ? "-" : undefined}
                inputPrefix="mh-i" onBlur={() => {}} onChange={change}/> : cell?.[1]}</td>;
          })}</tr>)}</tbody></table></div>}
      </section>)}
    </section></div>
    <div className="sticky bottom-3 flex items-center justify-between rounded-2xl border bg-white p-4 shadow-lg">
      <span role="status" className="text-xs text-gray-600">{notice || "Drafts stay in this browser tab."}</span>
      <button type="button" onClick={save} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white">Save Section {section} draft</button>
    </div></div>;
}