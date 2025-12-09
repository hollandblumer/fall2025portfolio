// src/data/projectData.js
const projectData = {
  meredithnorvell: {
    slug: "meredithnorvell",
    title: "Meredithnorvell.com",
    tagLine:
      "Designed and built with interactive book elements that steal the show.",
    palette: { bg: "#f4f4f4ff", ink: "#131414ff" },
    hero: {
      video:
        "https://cdn.dribbble.com/userupload/40963070/file/original-9d0283154634708e5626d91e4a7f3adb.mp4",
      alt: "Meredith Norvell — hero still",
    },
    sections: [
      {
        type: "video",
        src: "https://cdn.dribbble.com/userupload/40963070/file/original-9d0283154634708e5626d91e4a7f3adb.mp4",
        caption: "Home page of meredithnorvell.com",
        loop: true,
      },
      {
        type: "text",
        content: `Meredithnorvell.com is for publishers and social media followers to visit and browse. In our first session, we pulled together what the client already had: her logo, color scheme, professional headshots, and a Pinterest board of inspiration for her upcoming book. We also walked through websites that stood out to her and unpacked what she liked about them.

Towards the end of the meeting, I pulled up elements that caught my eye for this website, ones I had already compiled into a style guide ahead of time. My style guide is usually a Google Slides deck, with a slide for each component that separates a professionally designed website from the others—custom menu, loader, banner, font mix, color palette, scroll features, and subtle animations. Ultimately, we picked the best headshot for the homepage, of her reading on the couch that was horizontal, and both loved the idea of using a book loader animation.`,
      },
      {
        type: "image",
        src: "https://cdn.dribbble.com/userupload/40987294/file/original-5e40d2d2b3a6451793b392fd3aecb51c.webp?resize=1504x774&vertical=center",
        alt: "Mood board",
        caption: "Idea board that includes pictures and images of work",
      },
      {
        type: "text",
        content: `Post-meeting, while messing around with the book animation, I noticed it sort of looked like a menu and thought it would be cool if it was one. So I got to work, reversing the way the animation opened and closed, reducing the number of pages, making it open and close only once, and moving it to the top left corner of the screen once it opened and closed in the center. Early on, I realized I had to consider browser compatibility because the pages were flipping upside down on Safari. Since Safari struggles with rotateZ(180deg), I adjusted it to 179 degrees, and that did the trick. Once the closed book transitioned to the upper left corner, I set its display to none so that book2 could take its place. That way, when you clicked on book2, it would open a sliding menu. I also had to convert the code to simple HTML, CSS, and JS in case we were to inject it into a website builder like Wix. Due to time constraints, I passed the baton of book2’s sliding menu to the global team I’ve assembled. The header looked a little left-heavy with the book, especially on mobile, so I decided to add a custom-designed page ear on the right corner that served as a button when clicked, leading to the client's upcoming book.`,
      },
      {
        type: "video",
        src: "https://cdn.dribbble.com/userupload/40987299/file/original-31541fc7c70092556a2e00245016f223.mp4",
        caption: "Bright Silicon Stars Page on Meredithnorvell.com",
        loop: true,
      },
      {
        type: "video",
        src: "https://cdn.dribbble.com/userupload/40987297/file/original-ac0fb1e55139989e8c6e9df8605ac540.mp4",
        caption: "Social media reel for client based on web page animation",
        loop: true,
      },
      {
        type: "image",
        src: "https://cdn.dribbble.com/userupload/40987295/file/original-f494f73442597098b9f027d7aae1ac6d.webp?resize=1504x777&vertical=center",
        alt: "About",
        caption: "About Page of Meredithnorvell.com",
      },
      {
        type: "text",
        content:
          "For the about page, I kept it simple. I didn’t want to use the same concept as the Bright Silicon Stars book page to display photos, so I found a 2x2 gallery on Canva and put a flower in the middle, and exported it as an svg. Same with the contact form. Though, I really wanted to make it more fun by adding an interactive envelope, which I started here. Due to time constraints, I just made the contact page different colors and simple yet elegant. Thrilled with how this website turned out. Visit meredithnorvell.com to view it live.",
      },
      {
        type: "image",
        src: "https://cdn.dribbble.com/userupload/40987296/file/original-17caa51c2656694265c63939b13fe700.png?resize=1504x855&vertical=center",
        alt: "Contact",
        caption: "Contact Page",
      },
      {
        type: "video",
        src: "https://cdn.dribbble.com/userupload/40987298/file/original-1ce09837614ef019e0ec13a06959b249.mp4",
        caption: "Initial animation for contact form",
        loop: true,
      },
    ],
  },
  cherylfudge: {
    slug: "cherylfudge",
    title: "Cherylfudge.com",
    tagLine:
      "A website design that compliments Cheryl Fudge's modern, dynamic art with a nod to Nantucket.",
    palette: { bg: "#f4f4f4ff", ink: "#131414ff" }, // Placeholder for palette based on blue/coast theme
    hero: {
      video:
        "https://cdn.dribbble.com/userupload/42644442/file/original-353d0c120621f000d8cad934ecf17513.mp4",
      alt: "Cheryl Fudge website hero video",
    },
    sections: [
      {
        type: "text",
        content: `
Cheryl and I had our first meeting for her website on a beach in Nantucket, looking out at the harbor. While we caught up, I asked what inspires her. She pointed straight to the water. From there, I gathered images of what moves her, along with her art and past work, to shape the site.`,
      },
      {
        type: "image",
        src: "https://cdn.dribbble.com/userupload/42644906/file/original-1cd7acd7d13cdefb4a7a67bc4f08b3eb.jpeg?resize=1504x1128&vertical=center",
        alt: "Nantucket harbor inspiration",
        caption: "Inspiration for Cheryl Fudge's Website",
      },
      {
        type: "image",
        src: "https://cdn.dribbble.com/userupload/42644905/file/original-4cd165f70da4304c06a04323bdff5204.jpeg?resize=1504x2005&vertical=center",
        alt: "Smokey lines art inspiration",
        caption: "Smokey Lines that Cheryl Fudge Enjoys Painting",
      },
      {
        type: "text",
        content: `
Off the bat, I knew the color scheme would lean blue. I landed on a muted, cool shade to balance all the colors in Cheryl’s art. From there, I turned to CodePen and Pinterest, keeping her inspiration in mind, to find elements that felt fluid and echoed the coast. A few generative art pieces and SVG filters stood out to me.`,
      },
      {
        type: "image",
        src: "https://cdn.dribbble.com/userupload/42645387/file/original-b2b55f78fe3ff7010ffd4d35e3433246.png?resize=1504x733&vertical=center",
        alt: "Sandy flow field component",
        caption:
          "Sandy Flow Field, Which I Used as the Background for Website Components Found on My CodePen",
      },
      {
        type: "image",
        src: "https://cdn.dribbble.com/userupload/42644553/file/original-3af659af7e626b376168772477bb0edd.png?resize=1504x765&vertical=center",
        alt: "Interiors page screenshot",
        caption: "Interiors Page Featuring Cheryl's Interior Design Work",
      },
      {
        type: "video",
        src: "https://cdn.dribbble.com/userupload/42644554/file/original-c4964ccb325edb6612777a0a937c961f.mov",
        caption:
          "About Page on Cherylfudge.com, Inspired by the Smokey Lines She Draws",
        loop: true,
      },
      {
        type: "image",
        src: "https://cdn.dribbble.com/userupload/42645386/file/original-0174ee2676388fbf51492f41a65de65b.png?resize=1504x797&vertical=center",
        alt: "Homepage gallery layout",
        caption: "Gallery Layout for the Home Page of Cherylfudge.com",
      },
      {
        type: "text",
        content:
          "For the home page, I was inspired by a lot of gallery wall layouts I’ve seen, especially those using Three.js. Still, I wanted something that felt more fluid and more like water. I explored a few options that featured her work but ultimately landed on a concept built with plain CSS, which is even better for browser compatibility. ",
      },
    ],
  },
  americanseasons: {
    slug: "americanseasons",
    title: "Buzz-Worthy SVG Tracer Animation for American Seasons",
    tagLine:
      "Custom SVG tracer animation brings the restaurant's logo to life for dynamic social media content.",
    palette: { bg: "#F4F7EF", ink: "#212121" }, // Placeholder for palette based on bee/seasons
    hero: {
      video:
        "https://cdn.dribbble.com/userupload/43999509/file/original-cb29508e406a48e6a079f3f13d1283e3.mp4",
      alt: "American Seasons SVG Tracer Animation Demo",
    },
    sections: [
      {
        type: "text",
        content:
          "Neil, the owner and head chef of American Seasons, reached out looking for more dynamic Instagram content ahead of their seasonal opening on Nantucket.",
      },
      {
        type: "video",
        src: "https://cdn.dribbble.com/userupload/43999509/file/original-cb29508e406a48e6a079f3f13d1283e3.mp4",
        caption:
          "SVG Tracer Animation in action for the American Seasons Instagram reel.",
        loop: true,
      },
      {
        type: "text",
        content:
          "Inspired by the bee in their logo, I created a custom SVG tracer animation using JavaScript to animate a curly pollen path. I pulled everything together in Canva to produce an Instagram reel that brings their logo to life.",
      },
    ],
  },
  katherinegroverfinejewelry: {
    slug: "katherinegroverfinejewelry",
    title: "Canvas of Jewels for Katherine Grover Fine Jewelry",
    tagLine:
      "A custom canvas particle animation that uses jewelry designs as interactive particles to form a map of Nantucket.",
    palette: { bg: "#f4f4f4ff", ink: "#131414ff" }, // Placeholder for palette based on fine jewelry/canvas
    hero: {
      video:
        "https://cdn.dribbble.com/userupload/43826090/file/original-8a677209789bca38ccbf0b3c835cccc6.mp4",
      alt: "Katherine Grover Fine Jewelry Canvas Particle Animation",
    },
    sections: [
      {
        type: "text",
        content:
          "For Katherine Grover Fine Jewelry, I created a custom canvas particle animation that uses her own designs as the particles. These tiny pieces gently drift into place, eventually forming the shape of Nantucket with her signature logo anchored at the center.",
      },
      {
        type: "video",
        src: "https://cdn.dribbble.com/userupload/43826090/file/original-8a677209789bca38ccbf0b3c835cccc6.mp4",
        caption: "The particle animation forming the map of Nantucket.",
        loop: true,
      },
      {
        type: "text",
        content: `The base code came from a Bricks and Mortar Web tutorial on building an interactive particle logo with canvas and I reversed the particle coverage area. I rebuilt and extended it for high-res screens, mobile responsiveness, and most importantly, custom particle images. Instead of dots or circles, I loaded three pieces from her collection, scaled them down, and mapped them across the canvas using \`getImageData()\` from a reference layer.

The animation responds to mouse and touch.  I also used Greensock’s TweenLite.ticker for smooth animation and randomized easing to keep the motion feeling natural. The canvas is sharp on retina screens, and everything resizes dynamically so the logo always stays centered.

This isn’t just a hero animation. It’s a shimmer, a reveal, a floating tribute to her work.

More particle-based templates like this coming soon.`,
      },
    ],
  },
  madewithlove: {
    slug: "madewithlove",
    title: "When it comes together like this, it’s Valentine’s Day post-worthy",
    tagLine:
      "A generative art animation using thread-like strokes to form a heart and the text 'Made with Love' for a social media post.",
    palette: { bg: "#f4f4f4ff", ink: "#131414ff" }, // Placeholder for palette based on Valentine's Day/Love/Red
    hero: {
      video:
        "https://cdn.dribbble.com/userupload/40906361/file/original-391a3ed9ce0b7e144eca01fb724be566.mp4",
      alt: "Made with Love generative thread animation",
    },
    sections: [
      {
        type: "text",
        content:
          "This is the version I made for Cheryl Fudge who makes one of a kind art and clothing based in Nantucket, MA. Much like the title, a lot of love went into making the components of this Valentine’s Day post for a client in Nantucket, MA. Some of these elements, in fact, had been archived months ago, as I waited for the right moment to string them all together.",
      },
      {
        type: "text",
        content: `
The inspiration for this project stemmed from a piece I saw on Pinterest, designed by Tiffany Lo. The free-flowing continuity of the thread and how it formed the text, coupled with the subtle shift in thick and thin organic lines, stood out to me. I was also drawn to the idea of “beginning anywhere”. Cut to down the line, I came across a generative art code featured on CodePen that mimicked the thread-like, random behavior, and I quickly made the connection.`,
      },
      {
        type: "image",
        src: "https://cdn.dribbble.com/userupload/40906355/file/original-eafad0fda00dfee0430907aee38da23c.jpg?resize=1504x1945&vertical=center",
        alt: "Tiffany Lo's thread art inspiration",
        caption: "Inspiration piece designed by Tiffany Lo.",
      },
      {
        type: "image",
        src: "https://cdn.dribbble.com/userupload/40906356/file/original-e2ddf43f59fe2aded87d11258d8511f4.webp?resize=1504x1200&vertical=center",
        alt: "Generative art code inspiration screenshot",
        caption: "Screenshot of the generative art code found on CodePen.",
      },
      {
        type: "text",
        content: `
Knowing that this was the start of something good, I had to look under the hood. I was impressed by the idea of creating thread-like strokes with randomized color values, such as:
\`c.strokeStyle = "rgba(51," + Math.floor(Math.random() * 100 + 55) + ",51,1)"\`
and the fact that the code draws 200 tiny line segments per frame. With the animation running at 60 frames per second, that results in 12,000 lines drawn per second. I messed around with different values, thicknesses, and colors until I found something that felt smooth. I also noticed that the original code was still drawing transparent lines outside the canvas, making it less efficient. I fixed that and added boundaries in the center for the points to navigate around.`,
      },
      {
        type: "text",
        content: `
While brainstorming for a Valentine’s Day post, I decided to shape the boundaries in the center into a heart. To make it work within the canvas, I adjusted the coordinate system by flipping the heart’s y-values, negating \`py - heartY\` before applying the heart equation. This ensured the shape rendered correctly.

Next, I needed to find a font that would work in the center. I found inspiration from a poster  and had Lino, a similar font, as a reference. I worked with a designer to refine the lettering's curls and swoop placement. Considering the client’s clothes are all one-of-a-kind and handmade, "Made with Love" felt like the perfect fit. I fine-tuned everything in Adobe Illustrator to get the final vector shape.`,
      },
      {
        type: "image",
        src: "https://cdn.dribbble.com/userupload/40906357/file/original-b415dea5683426c1a6e0b52dcc6a27c4.webp?resize=1504x2126&vertical=center",
        alt: "Deepfried friends concept poster",
        caption: "Lettering concept for deepfried freinds by Anna Kulachek.",
      },
      {
        type: "image",
        src: "https://cdn.dribbble.com/userupload/40906354/file/original-e7d62c838597ba85af20072f2e7ac495.webp?resize=1504x576&vertical=center",
        alt: "Made with Love lettering detail",
        caption: "Close-up of the finalized 'Made with Love' lettering.",
      },
      {
        type: "text",
        content: `
Overall, I’m thrilled with how this piece turned out and hope that it spread love on Valentine’s Day for my client’s followers.`,
      },
      {
        type: "video",
        src: "https://cdn.dribbble.com/userupload/40906360/file/original-1c0f9cab7f9f2321779d44e30e3d7caf.mp4",
        caption: "Final animation of the 'Made with Love' post.",
        loop: true,
      },
    ],
  },
  aj: {
    slug: "aj",
    title: "It's Game On for a Sports Marketing Firm's Branding",
    tagLine:
      "Designing the Logo, Custom Animations, and Website for a Sports Marketing Firm",
    palette: { bg: "#F0F0F0", ink: "#202020" }, // Placeholder
    hero: {
      video: null, // No single hero video provided
      alt: "AJ Integrated Branding Concept", // Placeholder
    },
    sections: [
      {
        type: "text",
        content: `Client was looking for a professional logo and custom website to showcase their expertise in brand partnerships, highlighting past successes, core services, and case studies. They wanted something more engaging and compelling than standard templated websites, with a playful aspect inspired by their six-year-old daughter.`,
      },
      {
        type: "text",
        content: `
Here is a link to a blank style guide I've made based on my work with clients. It helps get the ball rolling in the first meeting by visualizing the possibilities of the creative direction. I also get organized, making a folder and a Pinterest board for the client.`,
      },
      {
        type: "text",
        content: `
Once a mood board was put together, I began searching for logo inspiration. I came across this logo on Pinterest:`,
      },
      {
        type: "image",
        src: "https://cdn.dribbble.com/userupload/41028161/file/original-187a0aba41ada49523ce53758fcd8576.png?resize=1504x900&vertical=center",
        alt: "Source of inspiration for AJ Integrated logo",
        caption:
          "The logo above was the source of inspiration for my client's logo.",
      },
      {
        type: "text",
        content: `Ultimately, I decided to merge the inspiration with a 'J' and asked a designer I work with to perfect it. I wanted to make the branding more playful and pulled up a website I had archived that used Matter.js in a clever manner. Given the business is about sports, I found suitable balls that could interact with the logo.`,
      },
      {
        type: "video",
        src: "https://cdn.dribbble.com/userupload/41028162/file/original-067928c75a7d3d6b4685559265e1fbe6.mp4",
        caption: "Matter.js animation interacting with the AJ Integrated logo.",
        loop: true,
      },
      {
        type: "text",
        content: `
The split text in the hero section creates a sharp, dynamic feel. The background animation adds depth. The callouts were positioned strategically. Every detail contributes to the flow, making the design feel intentional and connected.`,
      },
      {
        type: "video",
        src: "https://cdn.dribbble.com/userupload/41514812/file/original-18db272623106a8f737356f7596fe2d3.mp4",
        caption: "Demo of the website's dynamic hero section and split text.",
        loop: true,
      },
      {
        type: "text",
        content: `
This project was about more than building a website. It was about crafting an experience. The physics-based animations and bold branding reinforce the idea of momentum.`,
      },
    ],
  },
  checkerboard3d: {
    slug: "checkerboard3d",
    title: "CheckerBoard in Motion and 3D",
    tagLine: "",
    palette: { bg: "#f4f4f4ff", ink: "#131414ff" }, // Based on warm fall palette
    hero: {
      video:
        "https://assets.codepen.io/9259849/5cc44ca4-52f5-4d90-98a1-0d993bc4b837.mp4",
      alt: "3D Checkerboard animation moving to music",
    },
    sections: [
      {
        type: "text",
        content: `What started as an experiment pushing circles out of the board with 3D extrusion math turned into a checkerboard in motion. While looking for a hero idea for a client with a square-heavy logo, I stumbled onto a falling blocks animation on OpenProcessing and loved its checkered default pattern that was only meant to be a placeholder for an image. I kept that look, added a delay to the movement, carried over the depth from my initial experiment, tweaked the lighting, chose a warm fall palette, and set it to St. Germain for a cozy piano house feel. It ended up looking like the grid was dancing right along with the music.`,
      },
      {
        type: "video",
        src: "https://assets.codepen.io/9259849/5cc44ca4-52f5-4d90-98a1-0d993bc4b837.mp4",
        caption: "Final animation of the 3D Checkerboard.",
        loop: true,
      },
      {
        type: "text",
        content: "Check it out:", // This sets the intro text
      },
      {
        type: "link",
        href: "https://www.instagram.com/p/DQM3z9TDzv5/",
      },
      {
        type: "link",
        href: "https://codepen.io/hollandblumer/pen/ZYQoBVe",
      },
    ],
  },
  ccnycposter: {
    slug: "ccnycposter",
    title: "Creative Coding NYC Poster",
    tagLine:
      "A generative poster where the event information pulses through a grid of animated typography.",
    palette: { bg: "#f4f4f4ff", ink: "#131414ff" }, // Placeholder for dark background with glowing text
    hero: {
      video: "https://hollandblumer.github.io/portfolio_videos/cc.mp4", // This is based on the Work.jsx data
      alt: "Creative Coding NYC Animated Poster Demo",
    },
    sections: [
      {
        type: "text",
        content: `During a CCNYC weekly meetup, I volunteered to make the poster for the next event and pulled in a sine-wave typography experiment I had submitted to an OpenProcessing open call. In that sketch, I drew the word to an offscreen canvas, let each tile measure how far it was from the nearest letter pixel, and used that distance to offset a cosine wave so the blocks flip in a ripple that forms and moves through the word.`,
      },
      {
        type: "text",
        content: `For the CCNYC poster, I applied the same idea but replaced those blocks with the letters themselves. I generated a mask of the event text, built a grid of cells that each found the nearest character and the distance to the edge of its shape, then made each cell display the letter it was closest to instead of a block. The letters flip and shrink using the same distance-based timing, and a second blurred mask becomes a glowing halo that lets the important details pulse. The result is a poster where the information doesn’t just exist on the page, but comes alive with motion.`,
      },
      {
        type: "video",
        src: "https://hollandblumer.github.io/portfolio_videos/cc.mp4",
        caption: "The final Creative Coding NYC animated poster.",
        loop: true,
      },
    ],
  },
};

export default projectData;
