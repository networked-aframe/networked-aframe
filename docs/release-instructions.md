# Steps to make a new networked-aframe release

- update the version in `src/NafIndex.js` and `package.json`, `git commit -am"bump version to 0.8.0"`
- run `npm run dist` and commit the files `git commit -am"build dist"`
- `git tag 0.8.0` and `git push --tags`
- `npm login && npm publish`
- update the [naf-project](https://glitch.com/edit/#!/naf-project) base template on glitch (`package.json` and js links in the head, maybe update the `server.js`)
- write the release notes in `docs/RELEASE_NOTES.md` and on the [github release](https://github.com/networked-aframe/networked-aframe/releases)
- resync the [naf-examples](https://glitch.com/edit/#!/naf-examples) project on glitch, in the bottom left, click on Tools then Terminal

and type:

    git remote add upstream https://github.com/networked-aframe/networked-aframe.git
    git fetch upstream
    git reset --hard upstream/master
    refresh
