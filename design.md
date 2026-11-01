# 🎬 PROJECT: NETFLIX-STYLE STREAMING PLATFORM — UI/UX CLONE

## ROLE

Act as a Senior Frontend Developer, UI/UX Designer, and Software Architect specializing in premium video streaming platforms.

Your task is to build a high-fidelity Netflix-inspired streaming platform that closely recreates the visual design, layout, navigation, animations, responsiveness, and user experience of Netflix.

The application must feel like a professional, production-ready streaming service rather than a basic template.

**IMPORTANT:** Focus on recreating the UI/UX experience. Use original branding, logos, and content rather than copying Netflix's proprietary assets.

---

## 1. DESIGN SYSTEM

### Color Palette

- Primary Background: `#141414`
- Secondary Background: `#181818`
- Deep Black: `#000000`
- Primary Accent: `#E50914`
- Primary Text: `#FFFFFF`
- Secondary Text: `#B3B3B3`
- Card Background: `#2F2F2F`
- Border: `#333333`

### Typography

Use Netflix-inspired typography with:

- Font Family: Inter or Helvetica Neue
- Bold, cinematic headings
- Clean navigation labels
- Excellent text readability
- Consistent spacing and hierarchy

### Visual Style

- Premium cinematic appearance
- Dark immersive interface
- Large movie artwork
- Minimal borders
- Smooth transitions
- Subtle gradients
- Professional hover effects
- Carefully controlled spacing
- Consistent image aspect ratios

Avoid generic dashboard-style components.

---

## 2. NAVIGATION HEADER

Create a fixed navigation bar inspired by Netflix.

### Desktop Navigation

Left:

- Platform Logo
- Home
- TV Shows
- Movies
- New & Popular
- My List
- Browse by Languages

Right:

- Search Icon
- Notifications
- Profile Avatar
- Profile Dropdown

### Navigation Behavior

- Initially transparent when positioned over the hero banner.
- Smoothly transitions into a dark background when scrolling.
- Remains sticky at the top.
- Active navigation item is visually highlighted.
- Smooth hover transitions.
- Search icon expands into an animated search input.
- Profile dropdown opens on hover or click.

### Mobile Navigation

- Responsive navigation layout.
- Compact header.
- Touch-friendly controls.
- Collapsible menu.
- Smooth transitions.

---

## 3. CINEMATIC HERO SECTION

Create a full-width cinematic hero banner similar to Netflix's homepage.

### Layout

- Hero occupies approximately 75–90% of the viewport height on desktop.
- Large cinematic backdrop.
- Dark gradient overlay.
- Featured movie information aligned toward the left.
- Background fades smoothly into the content below.

### Hero Content

Include:

- Movie title or title artwork
- Short description
- Genre information
- Release year
- Age rating
- Play button
- More Info button

### Hero Buttons

**Play Button**

- White background
- Black play icon
- Bold label
- Smooth hover effect

**More Info Button**

- Semi-transparent gray background
- White information icon
- White label
- Subtle hover effect

### Hero Interactions

- Automatically rotate featured titles.
- Smooth crossfade transitions.
- Optional muted video trailer preview.
- Mute/unmute control.
- Loading skeleton while media loads.
- Responsive hero height.

---

## 4. MOVIE AND TV SHOW CAROUSELS

Build horizontally scrollable movie rows similar to Netflix.

### Homepage Sections

Include:

1. Trending Now
2. Continue Watching
3. Popular on the Platform
4. Top 10 Today
5. Recommended for You
6. New Releases
7. Action Movies
8. Comedy Movies
9. Anime Series
10. Documentaries
11. Because You Watched
12. My List

### Movie Cards

Each card must include:

- High-quality poster or backdrop
- Consistent aspect ratio
- Rounded corners where appropriate
- Lazy-loaded images
- Smooth hover transitions

### Desktop Hover Behavior

When hovering over a movie card:

1. Card enlarges smoothly.
2. Card appears above neighboring cards.
3. Expanded preview displays additional information.
4. Optional muted trailer preview starts after a short delay.
5. Interactive buttons appear.

### Expanded Card Information

- Play
- Add to My List
- Like
- More Information
- Match percentage
- Age rating
- Duration
- Genre tags

### Carousel Behavior

- Horizontal sliding animation.
- Left/right navigation arrows.
- Smooth scrolling.
- Multiple cards visible.
- Touch swipe support.
- Keyboard navigation.
- No horizontal page overflow.

Make hover animations feel smooth and polished.

---

## 5. TOP 10 RANKING SECTION

Create a Netflix-inspired Top 10 carousel.

### Requirements

- Oversized ranking numbers.
- Movie posters layered over ranking numbers.
- Horizontal carousel.
- Large typography.
- Smooth navigation.
- Responsive layout.

Ranking numbers should appear partially behind the movie posters.

---

## 6. MOVIE DETAILS MODAL

When a user clicks a movie card or More Info button, open a cinematic details modal.

### Modal Layout

Top:

- Large movie backdrop.
- Dark gradient overlay.
- Movie title.
- Play button.
- Add to List button.
- Close button.

Below:

- Match percentage.
- Release year.
- Age rating.
- Duration.
- Video quality badge.
- Synopsis.
- Cast.
- Genres.
- Director.

### Additional Sections

- Episodes (for TV series)
- More Like This
- Trailers and More
- About This Title

### Modal Interactions

- Smooth opening animation.
- Background scroll locking.
- Close on Escape.
- Close when clicking outside.
- Responsive layout.
- Scrollable content.
- Accessible keyboard controls.

---

## 7. VIDEO PLAYER UI

Build a professional Netflix-inspired video player interface.

### Player Features

- Full-screen video playback.
- Play/pause.
- Seek forward/backward.
- Volume control.
- Mute/unmute.
- Playback speed.
- Subtitles.
- Audio track selection.
- Episode selector.
- Fullscreen toggle.
- Next Episode button.
- Skip Intro button.
- Continue Watching progress tracking.

### Player Design

- Minimal controls.
- Controls appear when the mouse moves.
- Controls disappear after inactivity.
- Smooth animations.
- Large center play/pause feedback.
- Responsive progress bar.
- Video title displayed in the interface.

### Keyboard Shortcuts

- Space: Play/Pause
- Left Arrow: Rewind
- Right Arrow: Forward
- M: Mute
- F: Fullscreen
- Escape: Exit fullscreen

Support touch gestures on mobile.

---

## 8. SEARCH EXPERIENCE

Create an interactive search interface.

### Features

- Animated expanding search bar.
- Instant search results.
- Search by title.
- Search by genre.
- Search by actor.
- Search suggestions.
- Empty-state UI.
- Responsive results grid.

### Search Results

Display matching movies using the same card design as the homepage.

Search should update dynamically as the user types.

---

## 9. MOVIES AND TV SHOWS PAGES

Create separate browsing pages.

### Movies Page

- Featured movie banner.
- Genre selector.
- Trending movies.
- Popular movies.
- Recently added.
- Recommended movies.
- Movie grid.

### TV Shows Page

- Featured series banner.
- Genre selector.
- Popular series.
- Trending series.
- New episodes.
- Recommended series.

### Filtering

Allow users to filter by:

- Genre
- Release year
- Popularity
- Rating
- Language

Maintain consistent navigation and card interactions.

---

## 10. MY LIST PAGE

Create a personal watchlist.

### Features

- Save movies and series.
- Remove saved titles.
- Responsive movie grid.
- Empty-state design.
- Persist saved items.
- Instant UI updates.

The Add to My List button must update across the entire application.

---

## 11. CONTINUE WATCHING

Create a Continue Watching section.

Each card should display:

- Movie or series thumbnail.
- Playback progress bar.
- Resume button.
- Remaining duration.
- Remove from Continue Watching option.

Clicking Resume must continue playback from the previously saved timestamp.

---

## 12. PROFILE SELECTION SCREEN

Create a Netflix-inspired profile selection page.

### Layout

- Dark background.
- Centered heading: "Who's Watching?"
- Profile avatars arranged horizontally.
- Add Profile button.
- Manage Profiles button.

### Interactions

- Hover animation on avatars.
- Profile selection.
- Smooth transition into the homepage.
- Profile-specific watchlists.
- Profile-specific Continue Watching.

---

## 13. RESPONSIVE DESIGN

Ensure the entire application works across:

### Desktop

- 1920px
- 1440px
- 1366px

### Tablet

- 1024px
- 768px

### Mobile

- 430px
- 390px
- 375px
- 320px

### Responsive Requirements

- Adaptive navigation.
- Responsive hero.
- Touch-friendly carousels.
- Proper card scaling.
- Mobile-friendly details modal.
- Responsive video player.
- No overlapping UI.
- No unwanted horizontal scrolling.

Do not simply shrink the desktop interface.

Create layouts specifically optimized for each screen size.

---

## 14. ANIMATIONS AND MICRO-INTERACTIONS

Implement polished animations throughout the application.

### Required Animations

- Navigation background transition.
- Movie card hover expansion.
- Carousel sliding.
- Modal opening and closing.
- Button hover feedback.
- Search expansion.
- Profile hover effects.
- Skeleton loading.
- Image fade-in.
- Page transitions.
- Dropdown animations.
- Hero crossfades.

### Animation Guidelines

- Use GPU-friendly transforms.
- Avoid excessive animations.
- Target smooth 60 FPS interactions.
- Respect reduced-motion preferences.
- Avoid layout shifts.

---

## 15. LOADING STATES

Create professional loading experiences.

Include:

- Movie card skeletons.
- Hero skeleton.
- Page loading states.
- Image placeholders.
- Video buffering indicator.
- Search loading indicator.

Never show blank sections while content loads.

---

## 16. FOOTER

Create a minimal streaming-platform footer.

Include:

- Help Center
- Terms of Use
- Privacy
- Contact
- About
- Social media icons
- Copyright information

Maintain the same dark visual design.

---

## 17. COMPONENT ARCHITECTURE

Build reusable components.

Suggested structure:

src/
├── components/
│   ├── Navbar
│   ├── HeroBanner
│   ├── MovieCard
│   ├── MovieCarousel
│   ├── MovieDetailsModal
│   ├── TopTenCarousel
│   ├── VideoPlayer
│   ├── SearchBar
│   ├── ProfileAvatar
│   ├── GenreSelector
│   ├── LoadingSkeleton
│   └── Footer
├── pages/
│   ├── Home
│   ├── Movies
│   ├── TVShows
│   ├── Search
│   ├── MyList
│   ├── Watch
│   └── Profiles
├── hooks/
├── services/
├── contexts/
├── data/
├── utils/
└── styles/

---

## 18. DEVELOPMENT REQUIREMENTS

### Code Quality

- Clean, maintainable architecture.
- Reusable components.
- Consistent design tokens.
- Proper state management.
- Responsive styling.
- Accessibility support.
- Performance optimization.

### Performance

- Lazy-load movie images.
- Optimize rendering.
- Prevent unnecessary re-renders.
- Use efficient carousel rendering.
- Preload important hero assets.
- Handle missing images gracefully.

### Functional Requirements

Every visible interactive element must work.

Do not create buttons that do nothing.

If backend functionality is unavailable, implement functional frontend behavior using mock data and local storage.

---

## 19. FINAL DESIGN EXPECTATIONS

The completed application should feel extremely close to the Netflix browsing experience.

Prioritize:

1. Accurate visual proportions.
2. Cinematic hero section.
3. High-quality movie artwork.
4. Authentic carousel interactions.
5. Smooth movie card expansion.
6. Professional details modal.
7. Immersive video player.
8. Responsive navigation.
9. Premium animation quality.
10. Consistent design across pages.

Avoid:

- Generic SaaS dashboard layouts.
- Excessive rounded corners.
- Unnecessary borders.
- Bright backgrounds.
- Oversized gaps.
- Inconsistent movie card dimensions.
- Basic static carousels.
- Unpolished transitions.

---

## 20. IMPLEMENTATION INSTRUCTIONS

Follow this development sequence:

**Phase 1 — Design Foundation**

- Establish design tokens.
- Build application layout.
- Implement navigation.
- Create reusable UI components.

**Phase 2 — Homepage**

- Implement cinematic hero.
- Build movie carousels.
- Add Top 10 section.
- Implement hover previews.

**Phase 3 — Movie Discovery**

- Create Movies page.
- Create TV Shows page.
- Implement search.
- Implement movie details modal.

**Phase 4 — Streaming Experience**

- Implement video player.
- Add playback controls.
- Build Continue Watching.
- Add episode selection.

**Phase 5 — Personalization**

- Implement profile selection.
- Add My List.
- Persist playback progress.
- Implement profile-specific data.

**Phase 6 — Polish**

- Improve animations.
- Optimize responsiveness.
- Add loading skeletons.
- Test all interactions.
- Fix layout inconsistencies.
- Optimize performance.

---

## FINAL INSTRUCTION

Build this as a complete, premium-quality streaming platform frontend.

Do not produce a simplified Netflix-inspired landing page.

Recreate the full browsing and viewing experience with attention to visual accuracy, component behavior, animations, and responsive design.

Use original branding and legally usable movie artwork.

The final result should look and behave like a modern, professional streaming service ready for backend integration.
