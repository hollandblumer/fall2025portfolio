// src/data/projectData.js
const projectData = [
  {
    slug: "meredithnorvell",
    title: "Meredithnorvell.com",
    tagLine:
      "Designed and built with interactive book elements that steal the show.",
    palette: { bg: "#F6EBD6", ink: "#111827" },
    hero: {
      image:
        "https://images.unsplash.com/photo-1511765224389-37f0e77cf0eb?w=1600",
      alt: "Meredith Norvell — hero still",
    },
    sections: [
      {
        type: "video",
        src: "https://www.w3schools.com/html/mov_bbb.mp4",
        caption: "Home page by meredithnorvell.com",
        loop: true,
      },
      {
        type: "text",
        content: `Meredithnorvell.com is for publishers and social media followers to visit and browse. In our first session, we pulled together what the client already had: her logo, color scheme, professional headshots, and a Pinterest board of inspiration for her upcoming book. We also walked through websites that stood out to her and unpacked what she liked about them.

Towards the end of the meeting, I pulled up elements that caught my eye for this website, ones I had already compiled into a style guide ahead of time. My style guide is usually a Google Slides deck, with a slide for each component that separates a professionally designed website from the others—custom menu, loader, banner, font mix, color palette, scroll features, and subtle animations. Ultimately, we picked the best headshot for the homepage, of her reading on the couch that was horizontal, and both loved the idea of using a book loader animation.`,
      },
      {
        type: "image",
        src: "https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?w=1600",
        alt: "Mood board",
        caption: "Idea board that includes pictures and images of work",
      },
      {
        type: "text",
        content: `Post-meeting, while messing around with the book animation, I noticed it sort of looked like a menu and thought it would be cool if it was one. So I got to work, reversing the way the animation opened and closed, reducing the number of pages, making it open and close only once, and moving it to the top left corner of the screen once it opened and closed in the center. Early on, I realized I had to consider browser compatibility because the pages were flipping upside down on Safari. Since Safari struggles with rotateZ(180deg), I adjusted it to 179 degrees, and that did the trick. Once the closed book transitioned to the upper left corner, I set its display to none so that book2 could take its place. That way, when you clicked on book2, it would open a sliding menu. I also had to convert the code to simple HTML, CSS, and JS in case we were to inject it into a website builder like Wix. Due to time constraints, I passed the baton of book2’s sliding menu to the global team I’ve assembled. The header looked a little left-heavy with the book, especially on mobile, so I decided to add a custom-designed page ear on the right corner that served as a button when clicked, leading to the client's upcoming book.`,
      },
      {
        type: "video",
        src: "https://www.w3schools.com/html/mov_bbb.mp4",
        caption: "Book loader animation demo",
        loop: true,
      },
      {
        type: "video",
        src: "https://www.w3schools.com/html/mov_bbb.mp4",
        caption: "Sliding menu interaction",
        loop: true,
      },
      {
        type: "image",
        src: "https://images.unsplash.com/photo-1540397103387-3d1fca6c86b6?w=1400",
        alt: "Homepage hero",
        caption: "Homepage layout with type and texture",
      },
      {
        type: "text",
        content:
          "Designed and built with interactive book elements that steal the show.",
      },
      {
        type: "image",
        src: "https://images.unsplash.com/photo-1522199710521-72d69614c702?w=1400",
        alt: "Page ear interaction",
        caption: "Custom page-ear button linking to the upcoming book",
      },
      {
        type: "image",
        src: "https://images.unsplash.com/photo-1496307042754-b4aa456c4a2d?w=1400",
        alt: "Contact section concept",
        caption: "Contact concept with soft shadows and rounded corners",
      },
      {
        type: "image",
        src: "https://images.unsplash.com/photo-1511765224389-37f0e77cf0eb?w=1400",
        alt: "Idea board close-up",
        caption: "Closer look at the visual language references",
      },
    ],
  },
];

export default projectData;
