#!/bin/bash
set -e # fail on error
echo "Creating a new release"
npm ci
package_version=$(cat package.json | jq -r '.version')

# publish to npm
echo "publish to npm"
npm publish --access public

# tag on github
echo "create tag ${package_version}"
git ci -a -m "Package version ${package_version}"
git tag -a $package_version -m "Release of version $package_version"
git push --tags

# done
echo "Done"
echo "Please update the releases tab here: https://github.com/daostack/arc.js/releases"
