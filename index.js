const renameKeys = require("rename-keys");
const { Cluster } = require("puppeteer-cluster");

const headers = [
  "Player_Number_and_Positions",
  "player",
  "Date_of_birth_and_Age",
  "Nat",
  "club",
  "Height",
  "National_player",
  "International_matches",
  "Market_value",
];

const url = [
  "https://www.transfermarkt.com/detailsuche/spielerdetail/suche/35634238",
  "https://www.transfermarkt.com/detailsuche/spielerdetail/suche/35634238/page/1",
  "https://www.transfermarkt.com/detailsuche/spielerdetail/suche/35634238/page/2",
  "https://www.transfermarkt.com/detailsuche/spielerdetail/suche/35634238/page/3",
  "https://www.transfermarkt.com/detailsuche/spielerdetail/suche/35634238/page/4",
  "https://www.transfermarkt.com/detailsuche/spielerdetail/suche/35634238/page/5",
  "https://www.transfermarkt.com/detailsuche/spielerdetail/suche/35634238/page/6",
  "https://www.transfermarkt.com/detailsuche/spielerdetail/suche/35634238/page/7",
  "https://www.transfermarkt.com/detailsuche/spielerdetail/suche/35634238/page/8",
  "https://www.transfermarkt.com/detailsuche/spielerdetail/suche/35634238/page/9",
];

const PlayerScraping = async (page, link, Headers) => {
  console.log(`[+] Going to ${link}`);
  await page.waitForTimeout(5000);
  await page.waitForSelector("table.items");
  await page.waitForSelector("table.items tr.even");
  await page.waitForSelector("table.items tr.odd");
  const Table = await page.evaluate(async () => {
    function GetCellIndex(item) {
      if (item.classList.value === "hauptlink") {
        return item.closest("table").parentElement.cellIndex;
      }
      if (item.classList.value === "zentriert") {
        return item.cellIndex;
      }
      if (item.classList.value === "lightgreytext") {
        return item.closest("table").parentElement.cellIndex;
      }
      if (item.classList.value === "greentext") {
        return item.closest("table").parentElement.cellIndex;
      }
      if (item.classList.value === "rechts hauptlink") {
        return item.cellIndex;
      }
      if (item.classList.length === 3) {
        return item.cellIndex;
      }
      if (item.classList.value === "") {
        if (item.children[0] === undefined) {
          return item.cellIndex;
        }
        if (item.children[0].nodeName === "TABLE") {
          return item.cellIndex;
        } else {
          return item.closest("table").parentElement.cellIndex;
        }
      }
    }
    function GetCellContent(item) {
      if (item.classList.length === 3) {
        return item.textContent;
      }
      if (item.classList.value === "") {
        if (item.textContent === "") {
          return {
            src: item.querySelector("img").src,
            value: item.querySelector("img").alt,
          };
        } else {
          return item.textContent;
        }
      }
      if (item.classList.value === "zentriert") {
        if (item.querySelector("img")) {
          return {
            src: item.querySelector("img").src,
            value: item.querySelector("img").alt,
          };
        } else {
          return item.textContent;
        }
      }
      if (item.classList.value === "hauptlink") {
        return item.querySelector("a").href;
      } else {
        return item.textContent;
      }
    }
    const Table2 = Array.from(document.querySelectorAll("table.items tr.even"));
    const Table3 = Array.from(document.querySelectorAll("table.items tr.odd"));
    const Tablerows = [...Table2, ...Table3];
    const FinalList = [];
    for (var i = 0; i < Tablerows.length; ++i) {
      const list = Array.from(Tablerows[i].querySelectorAll("td"));
      const T = list.map((item) => {
        return {
          item: GetCellContent(item),
          id: GetCellIndex(item),
        };
      });
      FinalList.push(T);
    }
    const GroupingObjectByID = FinalList.map((item) => {
      const results = item.reduce(function (results, item) {
        (results[item.id] = results[item.id] || []).push(item.item);
        return results;
      }, {});
      return results;
    });
    return GroupingObjectByID;
  });

  const OnepageResult = Table.map((item) => {
    return renameKeys(item, function (key, val) {
      return Headers[key];
    });
  });

  return OnepageResult;
};

const ScrapPages = async (Pages /* , linkPage */, headers) => {
  let Results = [];
  /* const linkArrays = []; */
  /*   for (var x = 0; x < RangeOfPages.length; ++x) {
    let link = `${linkPage}/page/${RangeOfPages[x]}`;
    linkArrays.push(link);
  } */
  const cluster = await Cluster.launch({
    concurrency: Cluster.CONCURRENCY_CONTEXT,
    maxConcurrency: 2,
    monitor: true,
    retryLimit: 3,
    retryDelay: 1000,
    puppeteerOptions: {
      headless: true,
      args: [
        "--autoplay-policy=user-gesture-required",
        "--disable-background-networking",
        "--disable-background-timer-throttling",
        "--disable-backgrounding-occluded-windows",
        "--disable-breakpad",
        "--disable-client-side-phishing-detection",
        "--disable-component-update",
        "--disable-default-apps",
        "--disable-dev-shm-usage",
        "--disable-domain-reliability",
        "--disable-extensions",
        "--disable-features=AudioServiceOutOfProcess",
        "--disable-hang-monitor",
        "--disable-ipc-flooding-protection",
        "--disable-notifications",
        "--disable-offer-store-unmasked-wallet-cards",
        "--disable-popup-blocking",
        "--disable-print-preview",
        "--disable-prompt-on-repost",
        "--disable-renderer-backgrounding",
        "--disable-setuid-sandbox",
        "--disable-speech-api",
        "--disable-sync",
        "--hide-scrollbars",
        "--ignore-gpu-blacklist",
        "--metrics-recording-only",
        "--mute-audio",
        "--no-default-browser-check",
        "--no-first-run",
        "--no-pings",
        "--no-sandbox",
        "--no-zygote",
        "--password-store=basic",
        "--use-gl=swiftshader",
        "--use-mock-keychain",
      ],
    },
  });

  cluster.on("taskerror", (err, data, willRetry) => {
    if (willRetry) {
      console.warn(
        `Encountered an error while crawling ${data}. ${err.message}\nThis job will be retried`
      );
    } else {
      console.error(`Failed to crawl ${data}: ${err.message}`);
    }
  });

  // Define a task (in this case: screenshot of page)
  await cluster.task(async ({ page, data: url }) => {
    await page.goto(url);
    const GetTable = await PlayerScraping(page, url, headers);
    Results.push(GetTable);
  });

  for (const link of Pages) {
    cluster.queue(link);
  }

  // Shutdown after everything is done
  await cluster.idle();
  await cluster.close();
  console.log(Results);
  return Results;
};

ScrapPages(url, headers);
/* function rangeMaker(start, end, step = 1) {
  if (start === end) return [start];
  if (end > 10) return "you can Not Go over 10 Pages";
  const range = [];
  for (let i = start; i <= end; i += step) {
    range.push(i);
  }

  return range;
} */
