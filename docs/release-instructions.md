# Steps to make a new networked-aframe release

- update the version in `src/NafIndex.js`, `package-glitch.json` and `package.json`, `git commit -am"bump version to 0.8.0"`
- run `npm install` and `npm run dist` and commit the files `git commit -am"build dist"`
- If it's a major version, update the script tag in [README Basic Example](https://github.com/networked-aframe/networked-aframe#basic-example), in the [getting started tutorial](docs/getting-started-local.md) and the networked-aframe dependency version in the package.json snippet. Commit the changes.
- `git tag 0.8.0` and `git push --tags`
- `npm login && npm publish`
- update the [naf-project](https://glitch.com/edit/#!/naf-project) base template on glitch (`package.json` and js links in the head, maybe update the `server.js`)
- create a [github release](https://github.com/networked-aframe/networked-aframe/releases) and write the release notes there
- resync the [naf-examples](https://glitch.com/edit/#!/naf-examples) project on glitch, in the bottom left, click on Tools then Terminal

and type:

    git remote add upstream https://github.com/networked-aframe/networked-aframe.git
    git fetch upstream
    git reset --hard upstream/master
    cp package-glitch.json package.json
    rm package-lock.json
    refresh
