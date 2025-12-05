import { fetchTideData, HalfDay } from "@/lib/tides";

type TideEvent = {
  time: string;
  type: "Ebbe" | "Flut";
  height: string;
  coeff?: number;
  isFirstOfHalf?: boolean;
};

// Convert morning/afternoon data to chronological tide events
function toChronological(morning: HalfDay, afternoon: HalfDay): TideEvent[] {
  const morningEvents: TideEvent[] = [
    { time: morning.lowTime, type: "Ebbe" as const, height: morning.lowHeight, coeff: morning.coeff },
    { time: morning.highTime, type: "Flut" as const, height: morning.highHeight, coeff: morning.coeff },
  ].filter(e => e.time && e.time !== "--");

  const afternoonEvents: TideEvent[] = [
    { time: afternoon.lowTime, type: "Ebbe" as const, height: afternoon.lowHeight, coeff: afternoon.coeff },
    { time: afternoon.highTime, type: "Flut" as const, height: afternoon.highHeight, coeff: afternoon.coeff },
  ].filter(e => e.time && e.time !== "--");

  const sortByTime = (a: TideEvent, b: TideEvent) => {
    const timeA = a.time.replace("h", ":");
    const timeB = b.time.replace("h", ":");
    return timeA.localeCompare(timeB);
  };

  morningEvents.sort(sortByTime);
  afternoonEvents.sort(sortByTime);

  if (morningEvents.length > 0) morningEvents[0].isFirstOfHalf = true;
  if (afternoonEvents.length > 0) afternoonEvents[0].isFirstOfHalf = true;

  return [...morningEvents, ...afternoonEvents];
}

// Format height compactly
function compactHeight(h: string): string {
  return h.replace(/\s*m$/, "m").replace(" ", "");
}

export default async function Page() {
  const data = await fetchTideData();

  const toGerman = (label: string) => {
    return label
      .replace(/Lundi/i, "Mo")
      .replace(/Mardi/i, "Di")
      .replace(/Mercredi/i, "Mi")
      .replace(/Jeudi/i, "Do")
      .replace(/Vendredi/i, "Fr")
      .replace(/Samedi/i, "Sa")
      .replace(/Dimanche/i, "So")
      .replace(/janvier/i, "Jan")
      .replace(/février/i, "Feb")
      .replace(/mars/i, "Mär")
      .replace(/avril/i, "Apr")
      .replace(/mai/i, "Mai")
      .replace(/juin/i, "Jun")
      .replace(/juillet/i, "Jul")
      .replace(/août/i, "Aug")
      .replace(/septembre/i, "Sep")
      .replace(/octobre/i, "Okt")
      .replace(/novembre/i, "Nov")
      .replace(/décembre/i, "Dez");
  };

  const todayEvents = toChronological(data.today.morning, data.today.afternoon);

  // Visual indicators for tide type
  const TideIcon = ({ type }: { type: "Ebbe" | "Flut" }) => (
    <span className={`tide-icon ${type.toLowerCase()}`}>
      {type === "Flut" ? "▲" : "▼"}
    </span>
  );

  return (
    <main className="page notranslate">
      {/* Header */}
      <header className="header">
        <div className="header-left">
          <h1>Gezeiten Ver-sur-Mer</h1>
          <div className="date">{toGerman(data.todayDate)}</div>
        </div>
        <div className="header-right">
          {data.sunrise && data.sunset && (
            <div className="sun-info">
              <span>☀ {data.sunrise}</span>
              <span>☾ {data.sunset}</span>
            </div>
          )}
        </div>
      </header>

      {/* Today's tides */}
      <section className="today-section">
        <h2>Heute</h2>
        <div className="today-timeline">
          {todayEvents.map((event, i) => (
            <div key={i} className={`timeline-event ${event.type.toLowerCase()}`}>
              <TideIcon type={event.type} />
              <span className="event-time">{event.time}</span>
              <span className="event-type">{event.type}</span>
              <span className="event-height">{event.height}</span>
              {event.isFirstOfHalf && event.coeff && (
                <span className="event-coeff">K:{event.coeff}</span>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* 4-day forecast */}
      <section className="forecast-section">
        <h2>Nächste 4 Tage</h2>
        <table className="forecast-table">
          <thead>
            <tr>
              <th className="day-col">Tag</th>
              <th className="event-col">1.</th>
              <th className="event-col">2.</th>
              <th className="event-col">3.</th>
              <th className="event-col">4.</th>
            </tr>
          </thead>
          <tbody>
            {data.nextDays.slice(0, 4).map((day) => {
              const events = toChronological(day.morning, day.afternoon);
              return (
                <tr key={day.label}>
                  <td className="day-cell">{toGerman(day.label)}</td>
                  {[0, 1, 2, 3].map((idx) => {
                    const ev = events[idx];
                    if (!ev) return <td key={idx} className="event-cell empty">—</td>;
                    return (
                      <td key={idx} className={`event-cell ${ev.type.toLowerCase()}`}>
                        <span className={`cell-icon ${ev.type.toLowerCase()}`}>
                          {ev.type === "Flut" ? "▲" : "▼"}
                        </span>
                        {ev.time} {compactHeight(ev.height)}
                        {ev.isFirstOfHalf && ev.coeff && (
                          <span className="cell-coeff">K:{ev.coeff}</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      {/* Legend */}
      <div className="legend">
        <span><span className="legend-icon flut">▲</span> Flut (Hochwasser)</span>
        <span><span className="legend-icon ebbe">▼</span> Ebbe (Niedrigwasser)</span>
        <span><span className="legend-coeff">K:100</span> Koeffizient</span>
      </div>

      {/* Footer */}
      <footer className="footer">
        Quelle:{" "}
        <a href="https://www.horaire-maree.fr/maree/Ver-sur-Mer/">
          horaire-maree.fr
        </a>{" "}
        • Angaben ohne Gewähr
      </footer>
    </main>
  );
}
