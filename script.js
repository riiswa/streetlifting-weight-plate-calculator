const worker = new Worker("worker.js");

function w(x, target) {
    if (x >= 20) {
        return 0.75;
    } else if (x <= 2.5) {
        return 0.51
    } else {
        return 1;
    }
}

function buildProblem(weights, target) {
    const cs = Object.entries(weights).flatMap(([k, v], i) => parseFloat(k) < 20 ? [`c${i}`] : []).join(" + " )
    const M = 1000
    const bigPlates = Object.entries(weights).flatMap(([k, v], i) => parseFloat(k) >= 20 ? [`${1/M} l${i}`, `${1/M} r${i}`] : []).join(" - " )

    const pb = [
        "Minimize",
        "\t" + Object.entries(weights).map(([k, v], i) =>`${w(parseFloat(k))} l${i} + ${w(parseFloat(k))} c${i} + ${w(parseFloat(k))} r${i}`).join(" + ") +
        " + " + Object.entries(weights).map(([k, v], i) =>`${parseFloat(k)} l'${i}`).join(" + ") + " - " + Object.entries(weights).map(([k, v], i) =>`${parseFloat(k)} r'${i}`).join(" - "),
        " + " + Object.entries(weights).map(([k, v], i) =>`0.25 l''${i} - 0.25 r''${i}`).join(" + "),// + " - " + Object.entries(weights).map(([k, v], i) =>`0.25 r''${i}`).join(" - "),
        "Subject To",
        Object.entries(weights).map(([k, v], i) => `\tl${i} + c${i} + r${i} <= ${v}`).join("\n"),
        "\t" + Object.entries(weights).map(([k, v], i) => `${k} l${i} + ${k} c${i} + ${k} r${i}`).join(" + ") + ` = ${target}`,
        "\t" + Object.entries(weights).map(([k, v], i) => `c${i}`).join(" + ") + " <= 1",
        //Object.entries(weights).flatMap(([k, v], i) => parseFloat(k) >= 20 && cs !== "" ? [`\tl${i} - ${cs} <= r2`, `\tr${i} + ${cs} - r'${i} >= 0`] : []).join("\n"),
        "\t" + Object.entries(weights).map(([k, v], i) => `${k} l${i}`).join(" + ") + " - " + Object.entries(weights).map(([k, v], i) => `${k} r${i}`).join(" - ") + " >= 0",
        Object.entries(weights).map(([k, v], i) => `\tl''${i} - r''${i} >= 0`).join("\n"),// + " - " + Object.entries(weights).map(([k, v], i) => `r''${i}`).join(" - ") + " >= 0",
        "\t b'' - b' = 0",
        bigPlates !== "" ? `\tb'' - ${bigPlates} >= 0`: "",
        bigPlates !== "" ? `\tb'' - ${bigPlates} - 1 - b' <= 0`: "",
        cs !== "" ? `\t b' + ${cs} <= 1`: "",
        target > 20 ? Object.entries(weights).flatMap(([k, v], i) => parseFloat(k) < 10 ? [`\tc${i} = 0`]: []).join("\n") : "",
        Object.entries(weights).map(([k, v], i) => `\tl${i} - l'${i} = 0`).join("\n"),
        Object.entries(weights).map(([k, v], i) => `\tr${i} - r'${i} = 0`).join("\n"),

        Object.entries(weights).map(([k, v], i) => `\tl${i} - l''${i} = 0`).join("\n"),
        Object.entries(weights).map(([k, v], i) => `\tr${i} - r''${i} = 0`).join("\n"),
        "Bounds",
        Object.entries(weights).map(([k, v], i) => `\t0 <= l${i}`).join("\n"),
        Object.entries(weights).map(([k, v], i) => `\t0 <= c${i}`).join("\n"),
        Object.entries(weights).map(([k, v], i) => `\t0 <= r${i}`).join("\n"),
        "General",
        "\t" + Object.entries(weights).map(([k, v], i) => `l${i} l'${i} l''${i} c${i} r${i} r'${i} r''${i}`).join(" "),
        "Binary",
        "\tb' b''",
        "End"
    ]

    return pb.join("\n");
}

const plates2div = {
    25: `<span class="w-full text-red-400 font-semibold m-auto">25 kg</span>`,
    20: `<span class="w-full text-blue-400 font-semibold m-auto">20 kg</span>`,
    15: `<span class="w-full text-yellow-400 font-semibold m-auto">15 kg</span>`,
    10: `<span class="w-full text-green-400 font-semibold m-auto">10 kg</span>`,
    5: `<span class="w-full text-gray-100 font-semibold m-auto">5 kg</span>`,
    2.5: `<span class="w-full text-gray-600 font-semibold m-auto">2.5 kg</span>`,
    1.25: `<span class="w-full text-gray-300 font-semibold m-auto">1.25 kg</span>`,
    0.5: `<span class="w-full text-gray-300 font-semibold m-auto">0.5 kg</span>`,
    0.25: `<span class="w-full text-gray-300 font-semibold m-auto">0.25 kg</span>`,
}

worker.onmessage = function ({data: {solution, weights, error}}) {
    console.log(solution)
    if (solution) {
        if (solution.Status === "Optimal") {
            const plates = {l: [], c: [], r: []}
            Object.entries(solution["Columns"]).forEach(([k, v]) => {

                if (v["Primal"] > 0.9 && !k.includes("'")) {
                    for (let i = 0; i < v["Primal"]; i++) {
                        plates[k[0]].push(parseFloat(Object.keys(weights)[k.slice(1)]))
                    }
                }
            })
            plates.l.sort(function(a, b) {return a - b;})
            plates.r.sort(function(a, b) {return b - a;})

            const chosenPlates = plates.l.sort(function(a, b) {return a - b;}).concat(plates.c, plates.r.sort(function(a, b) {return b - a;}));
            result.replaceChildren();
            result.innerHTML = `<p class="text-lg text-gray-100 text-center px-5">${chosenPlates.map((w) => plates2div[w]).join(" + ")}</p>`
            result.innerHTML += `<div class="flex justify-center gap-x-px items-center p-5">${chosenPlates.map((w) => `<div class="plate plate-${w.toString().replace(".", "-")}"></div>`).join("\n")}</div>`

        } else {
            result.replaceChildren();
            result.innerHTML = `<p class="text-lg text-red-500 text-center px-5">No solution found. Your available plates cannot sum up to the target weight. Please consider adjusting your target <i class='bx bxs-error align-middle text-lg' ></i></p>`
        }
    }
    else console.log(error);
};
