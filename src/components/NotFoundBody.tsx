// What the public site shows for a page that does not exist: the words and
// sizes of Next's built-in "not found" page, which the site showed inside
// its header and footer before it had a not-found of its own. Kept the same
// on purpose, so nothing a visitor sees has changed; a designed page can
// replace it. Used by src/app/global-not-found.tsx (an address no route
// owns) and src/app/(site)/not-found.tsx (notFound() of a site page).
export function NotFoundBody() {
  return (
    <>
      <title>404: This page could not be found.</title>
      <div
        style={{
          fontFamily: 'system-ui,"Segoe UI",Roboto,Helvetica,Arial,sans-serif,"Apple Color Emoji","Segoe UI Emoji"',
          height: "100vh",
          textAlign: "center",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div>
          <h1
            style={{
              display: "inline-block",
              margin: "0 20px 0 0",
              padding: "0 23px 0 0",
              fontSize: 24,
              fontWeight: 500,
              verticalAlign: "top",
              lineHeight: "49px",
              borderRight: "1px solid rgba(0,0,0,.3)",
            }}
          >
            404
          </h1>
          <div style={{ display: "inline-block" }}>
            <h2 style={{ fontSize: 14, fontWeight: 400, lineHeight: "49px", margin: 0 }}>This page could not be found.</h2>
          </div>
        </div>
      </div>
    </>
  );
}
