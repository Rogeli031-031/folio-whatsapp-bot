import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pagePath = path.join(__dirname, "..", "app", "page.tsx");
let s = fs.readFileSync(pagePath, "utf8").replace(/\r\n/g, "\n");

const start = `        {plantaFilter ? <div className="flex-1 min-h-[35vh] mt-6" aria-hidden /> : null}
      </main>
      {presupuestoDetalle && (`;

const end = `              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Home()`;

const i = s.indexOf(start);
const j = s.indexOf(end);
if (i < 0 || j < 0 || j <= i) {
  console.error("Markers not found", { i, j });
  process.exit(1);
}

const replacement = `      </main>
    </div>
  );
}

export default function Home()`;

s = s.slice(0, i) + replacement + s.slice(j + end.length);
fs.writeFileSync(pagePath, s, "utf8");
console.log("Removed modals block");
