#!/bin/bash
# ImageBox Docker Release Script
# Usage: ./scripts/release.sh [version]
# Example: ./scripts/release.sh 0.1.8
#          ./scripts/release.sh        (auto-increment patch version)

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  ImageBox Docker Release Script${NC}"
echo -e "${BLUE}========================================${NC}"

# Step 1: Check for uncommitted changes
echo -e "\n${YELLOW}[1/6] Checking for uncommitted changes...${NC}"
if [[ -n $(git status --porcelain) ]]; then
    echo -e "${RED}Error: You have uncommitted changes. Please commit or stash them first.${NC}"
    git status --short
    exit 1
fi
echo -e "${GREEN}✓ Working directory is clean${NC}"

# Step 2: Get current and next version
echo -e "\n${YELLOW}[2/6] Determining version...${NC}"
CURRENT_TAG=$(git describe --tags --abbrev=0 2>/dev/null || echo "v0.0.0")
CURRENT_VERSION=${CURRENT_TAG#v}

if [[ -n "$1" ]]; then
    # Use provided version
    NEW_VERSION="$1"
else
    # Auto-increment patch version
    IFS='.' read -ra VERSION_PARTS <<< "$CURRENT_VERSION"
    MAJOR=${VERSION_PARTS[0]:-0}
    MINOR=${VERSION_PARTS[1]:-0}
    PATCH=${VERSION_PARTS[2]:-0}
    PATCH=$((PATCH + 1))
    NEW_VERSION="${MAJOR}.${MINOR}.${PATCH}"
fi

NEW_TAG="v${NEW_VERSION}"
echo -e "Current version: ${CURRENT_TAG}"
echo -e "New version: ${GREEN}${NEW_TAG}${NC}"

# Step 3: Verify tag doesn't exist
echo -e "\n${YELLOW}[3/6] Verifying tag doesn't exist...${NC}"
if git rev-parse "$NEW_TAG" >/dev/null 2>&1; then
    echo -e "${RED}Error: Tag ${NEW_TAG} already exists${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Tag ${NEW_TAG} is available${NC}"

# Step 4: Run build to check for errors
echo -e "\n${YELLOW}[4/6] Running build check (this may take a minute)...${NC}"
if ! npm run build > /tmp/build-output.txt 2>&1; then
    echo -e "${RED}Error: Build failed. See output below:${NC}"
    cat /tmp/build-output.txt
    exit 1
fi
echo -e "${GREEN}✓ Build successful${NC}"

# Step 5: Confirm release
echo -e "\n${YELLOW}[5/6] Confirm release...${NC}"
echo -e "This will:"
echo -e "  - Create tag ${GREEN}${NEW_TAG}${NC}"
echo -e "  - Push to GitHub"
echo -e "  - Trigger Docker build for ${BLUE}octoooo/imagebox:${NEW_VERSION}${NC}"
echo -e "  - Build takes ~25-30 minutes for multi-arch (amd64 + arm64)"
echo ""
read -p "Continue? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Release cancelled${NC}"
    exit 0
fi

# Step 6: Create and push tag
echo -e "\n${YELLOW}[6/6] Creating and pushing tag...${NC}"
git tag "$NEW_TAG"
git push origin "$NEW_TAG"

echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}  Release ${NEW_TAG} initiated!${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "\nMonitor build progress:"
echo -e "  ${BLUE}gh run list --limit 1${NC}"
echo -e "  ${BLUE}gh run watch${NC}"
echo -e "\nOr view on GitHub:"
echo -e "  ${BLUE}https://github.com/Octo-o-o-o/ImageBox/actions${NC}"
echo -e "\nDocker image will be available at:"
echo -e "  ${BLUE}docker pull octoooo/imagebox:${NEW_VERSION}${NC}"
echo -e "  ${BLUE}docker pull octoooo/imagebox:latest${NC}"
