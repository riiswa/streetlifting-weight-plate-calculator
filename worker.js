importScripts("highs.js");

onmessage = async function ({ data }) {
  const [problem, weights] = data;
  console.log(problem);
  const highs = await Module();
  try {
    postMessage({ solution: highs.solve(problem), weights });
  } catch (error) {
    postMessage({ error: error.toString() });
  }
};
