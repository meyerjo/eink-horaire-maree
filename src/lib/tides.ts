// lib/tides.ts
import * as cheerio from "cheerio";

const URL = "https://www.horaire-maree.fr/maree/Ver-sur-Mer/";

export type HalfDay = {
  coeff: number;
  lowTime: string;
  lowHeight: string;
  highTime: string;
  highHeight: string;
};

export type TideDay = {
  label: string;
  morning: HalfDay;
  afternoon: HalfDay;
};

export type TideData = {
  todayDate: string;
  today: TideDay;
  nextDays: TideDay[];
  sunrise?: string;
  sunset?: string;
};

export async function fetchTideData(): Promise<TideData> {
  const res = await fetch(URL, {
    headers: {
      "User-Agent": "ver-sur-mer-tides-app (https://vercel.com)",
    },
    // Revalidate every 30 minutes
    next: { revalidate: 1800 },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch tide data: ${res.status}`);
  }

  const html = await res.text();
  return parseTidePage(html);
}

/**
 * Parse the tide page using cheerio for proper DOM traversal.
 */
function parseTidePage(html: string): TideData {
  const $ = cheerio.load(html);

  // --- Today's date ---
  // Located in: <div id="i_header_tbl_droite"><h3 class="orange">Marée aujourd'hui<br />jeudi 4 décembre 2025</h3></div>
  const todayHeaderText = $("#i_header_tbl_droite h3.orange").text();
  const todayDate = todayHeaderText
    .replace(/Marée aujourd[''']hui/i, "")
    .trim();

  // --- Today's tide table ---
  // Located in: <div id="i_donnesJour"><table class="tableau">...</table></div>
  const todayTable = $("#i_donnesJour table.tableau");
  const today = parseTodayTable($, todayTable, todayDate);

  // --- Next 10 days table ---
  // Located in: <div id="i_donnesLongue"><table class="tableau">...</table></div>
  const nextDaysTable = $("#i_donnesLongue table.tableau");
  const nextDays = parseNextDaysTable($, nextDaysTable);

  // --- Sunrise / Sunset ---
  // Located in footer text: "Horaire Lever du soleil Ver-sur-mer : 08:44"
  const footerText = $("#explication_marees").text();
  const sunriseMatch = footerText.match(
    /Lever du soleil[^:]*:\s*(\d{2}:\d{2})/i
  );
  const sunsetMatch = footerText.match(
    /Coucher du soleil[^:]*:\s*(\d{2}:\d{2})/i
  );

  return {
    todayDate,
    today,
    nextDays,
    sunrise: sunriseMatch?.[1],
    sunset: sunsetMatch?.[1],
  };
}

/**
 * Parse today's tide table.
 * Structure:
 *   Row 0: Header (Matin | Après midi)
 *   Row 1: Subheader (Coeff. | Basse mer | Pleine mer | Coeff. | Basse mer | Pleine mer)
 *   Row 2: Data row with 6 cells
 */
function parseTodayTable(
  $: cheerio.CheerioAPI,
  table: ReturnType<cheerio.CheerioAPI>,
  label: string
): TideDay {
  // Find the last row (data row) - it has 6 td cells
  const rows = table.find("tr");
  const dataRow = rows.last();
  const cells = dataRow.find("td");

  if (cells.length < 6) {
    throw new Error(
      `Expected 6 cells in today's data row, found ${cells.length}`
    );
  }

  // Extract values from each cell
  // Cell structure: <td><strong>03h49</strong><br /> 1,17 m</td>
  const morning: HalfDay = {
    coeff: parseCoeff($(cells[0]).text()),
    ...parseTimeHeight($(cells[1]).text()), // low tide
    ...prefixKeys(parseTimeHeight($(cells[2]).text()), "high"), // high tide
  };

  const afternoon: HalfDay = {
    coeff: parseCoeff($(cells[3]).text()),
    ...parseTimeHeight($(cells[4]).text()), // low tide
    ...prefixKeys(parseTimeHeight($(cells[5]).text()), "high"), // high tide
  };

  return {
    label,
    morning: {
      coeff: morning.coeff,
      lowTime: morning.lowTime,
      lowHeight: morning.lowHeight,
      highTime: morning.highTime,
      highHeight: morning.highHeight,
    },
    afternoon: {
      coeff: afternoon.coeff,
      lowTime: afternoon.lowTime,
      lowHeight: afternoon.lowHeight,
      highTime: afternoon.highTime,
      highHeight: afternoon.highHeight,
    },
  };
}

/**
 * Parse coefficient from text like "94" or "<strong>94</strong>"
 */
function parseCoeff(text: string): number {
  const match = text.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
}

/**
 * Parse time and height from text like "03h49 1,17 m"
 * Returns { lowTime, lowHeight } (default prefix is "low")
 */
function parseTimeHeight(text: string): { lowTime: string; lowHeight: string } {
  const timeMatch = text.match(/(\d{2}h\d{2})/);
  const heightMatch = text.match(/([\d,]+)\s*m/);

  return {
    lowTime: timeMatch?.[1] || "--",
    lowHeight: heightMatch ? `${heightMatch[1]} m` : "-- m",
  };
}

/**
 * Change "low" prefix to "high" for high tide data
 */
function prefixKeys(
  obj: { lowTime: string; lowHeight: string },
  prefix: "high"
): { highTime: string; highHeight: string } {
  return {
    highTime: obj.lowTime,
    highHeight: obj.lowHeight,
  };
}

/**
 * Parse the next 10 days table.
 * Structure:
 *   Row 0: Header (Date | Matin | Après-midi)
 *   Row 1: Subheader (Coeff. | Basse mer | Pleine mer | Coeff. | Basse mer | Pleine mer)
 *   Rows 2+: Data rows with 7 cells (Date + 6 tide values)
 */
function parseNextDaysTable(
  $: cheerio.CheerioAPI,
  table: ReturnType<cheerio.CheerioAPI>
): TideDay[] {
  const days: TideDay[] = [];
  const rows = table.find("tr");

  rows.each((index, row) => {
    const cells = $(row).find("td");

    // Skip rows without 7 cells (headers, etc.)
    if (cells.length < 7) return;

    const label = $(cells[0]).text().trim().replace(/^Demain\s*/i, "");

    const morning: HalfDay = {
      coeff: parseCoeff($(cells[1]).text()),
      ...parseTimeHeight($(cells[2]).text()),
      ...prefixKeys(parseTimeHeight($(cells[3]).text()), "high"),
    };

    const afternoon: HalfDay = {
      coeff: parseCoeff($(cells[4]).text()),
      ...parseTimeHeight($(cells[5]).text()),
      ...prefixKeys(parseTimeHeight($(cells[6]).text()), "high"),
    };

    days.push({
      label,
      morning: {
        coeff: morning.coeff,
        lowTime: morning.lowTime,
        lowHeight: morning.lowHeight,
        highTime: morning.highTime,
        highHeight: morning.highHeight,
      },
      afternoon: {
        coeff: afternoon.coeff,
        lowTime: afternoon.lowTime,
        lowHeight: afternoon.lowHeight,
        highTime: afternoon.highTime,
        highHeight: afternoon.highHeight,
      },
    });
  });

  return days;
}
