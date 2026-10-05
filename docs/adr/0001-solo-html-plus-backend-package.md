# Solo HTML plus backend package

Browsers cannot read a local path from JS, so the npm package ships a minuscule local backend that reads the picked file and bakes its text into the served viewer. The solo HTML stays server-free for humans. Backend stays under 10 MB, zero dependencies, and never sits idle: it serves one view, then exits.
