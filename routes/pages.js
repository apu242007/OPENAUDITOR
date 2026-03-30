'use strict';

function registerPageRoutes(deps) {
  const { app, path, publicDir } = deps;

  app.get('/editor/:id', (req, res) => res.sendFile(path.join(publicDir, 'editor.html')));
  app.get('/inspector/:id', (req, res) => res.sendFile(path.join(publicDir, 'inspector.html')));
  app.get('/inspect/:id', (req, res) => res.sendFile(path.join(publicDir, 'inspect.html')));
  app.get('/actions', (req, res) => res.sendFile(path.join(publicDir, 'actions.html')));
  app.get('/compare', (req, res) => res.sendFile(path.join(publicDir, 'compare.html')));
  app.get('/settings', (req, res) => res.sendFile(path.join(publicDir, 'settings.html')));
  app.get('/about', (req, res) => res.sendFile(path.join(publicDir, 'about.html')));
  app.get('/catalog', (req, res) => res.sendFile(path.join(publicDir, 'catalog.html')));
  app.get('/abou', (req, res) => res.redirect('/about'));
  app.get('/search', (req, res) => res.sendFile(path.join(publicDir, 'search.html')));
  app.get('/login', (req, res) => res.redirect('/')); app.get('/analytics', (req, res) => res.sendFile(path.join(publicDir, 'analytics.html')));
}

module.exports = {
  registerPageRoutes
};
