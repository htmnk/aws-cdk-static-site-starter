function rewritePageUri(uri) {
  var isDir = uri.endsWith("/");
  // Handle both "/posts/my-post" and "/posts/my-post/"
  return uri + (isDir ? '' : '/') + 'index.html';
}

function handler(event) {
  var request = event.request;

  // Requesting a page ("/" or "/posts/my-post")
  if (!request.uri.includes(".")) {
    // Append index.html to the requested uri
    request.uri = rewritePageUri(request.uri);
  }

  return request;
}