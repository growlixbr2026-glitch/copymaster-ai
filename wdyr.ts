// Why Did You Render — debug de re-renders em desenvolvimento
// Inspirado em: welldone-software/why-did-you-render
// NUNCA usar em produção — monkey patches React e degrada performance

import React from 'react';

if (process.env.NODE_ENV === 'development') {
  // @ts-ignore
  const whyDidYouRender = require('@welldone-software/why-did-you-render');
  whyDidYouRender(React, {
    trackAllPureComponents: true,
    trackHooks: true,
    logOnDifferentValues: false,
    collapseGroups: true,
    titleColor: '#058',
    diffNameColor: 'blue',
    diffPathColor: 'red',
    textBackgroundColor: 'white',
  });
}
