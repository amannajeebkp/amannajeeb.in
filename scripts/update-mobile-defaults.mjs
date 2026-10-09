import fs from "fs";

const stickersPath = "./src/data/stickers.json";
const stickers = JSON.parse(fs.readFileSync(stickersPath, "utf-8"));

// Mobile target positions that surround the 672x504 board proportionally
// Visible mobile range around board: X: -160 to +832, Y: -250 to +754
const mobileConfig = {
  // NJ Peeking top center
  "360292ea-034a-4d89-8d53-97b4d321c2df": { x: 24, y: -290, width: 624, rot: 0, layer: "front" },
  // Name Sticker above NJ
  "bdefe032-ba93-4d07-b9ee-dfa326f9301a": { x: 190, y: -340, width: 260, rot: -8, layer: "front" },
  // Sun top right
  "7dcf62cf-1cd0-4e1c-a1c8-3d34f036f898": { x: 520, y: -300, width: 170, rot: 7, layer: "back" },
  // Airplane top right
  "97c279e1-cc5f-4c31-9bd2-c82acf95b759": { x: 470, y: -220, width: 220, rot: -10, layer: "front" },
  // Bike top right corner
  "0ffee622-1497-47f9-a8c1-75e92af8a30b": { x: 530, y: -130, width: 180, rot: -1, layer: "back" },
  // Shoe top left
  "ce795411-d1d6-468f-a5cf-68d4270abe05": { x: -80, y: -230, width: 210, rot: 8, layer: "front" },
  // London top left
  "b9226152-97c7-4640-94b7-ef775124e046": { x: -140, y: -310, width: 220, rot: 0, layer: "front" },
  // Bolun left upper
  "d61a19f1-f799-4f7a-97ee-7737d2a0c711": { x: -140, y: -100, width: 190, rot: 0, layer: "front" },
  // Meetup left center
  "c6a02f86-2eb4-4002-bafd-023212bb1798": { x: -130, y: 50, width: 210, rot: 14, layer: "front" },
  // LinkedIn left edge of card
  "8e82eec4-5011-4d49-bee6-4b34f0464e57": { x: -60, y: 60, width: 150, rot: -21, layer: "front" },
  // Marlie left lower
  "11b93766-2f11-446d-b7ad-116a4a7a345e": { x: -150, y: 220, width: 200, rot: -19, layer: "front" },
  // Phone WhatsApp left
  "17a9eb33-7c0b-40e1-9468-be239b003798": { x: -90, y: 220, width: 170, rot: 0, layer: "front" },
  // Head left bottom
  "1dfe45e8-4ad3-4059-972a-40d68a0affaa": { x: -120, y: 380, width: 210, rot: 0, layer: "back" },
  // Thug Life sticker
  "cebed9e5-9f65-4529-907c-160fa029201c": { x: -120, y: 440, width: 170, rot: 0, layer: "front" },
  // Thumbs up bottom left
  "dee114a1-2f16-4161-861e-8cc60edefd66": { x: -40, y: 510, width: 140, rot: 0, layer: "front" },
  // Flinker bottom left
  "fe06037a-0bc2-439e-9c21-6f742d3a91e2": { x: -140, y: 560, width: 210, rot: 0, layer: "front" },
  // Polaroid right top
  "d01de083-c8a6-47a7-889f-65d15f9a2703": { x: 570, y: -40, width: 180, rot: 8, layer: "front" },
  // Macbook right upper
  "f8979827-41e5-4d67-9dde-8cf7cb1ff286": { x: 560, y: 40, width: 190, rot: 0, layer: "back" },
  // Email right edge
  "34edec86-1799-4c28-8221-70860c7c3457": { x: 560, y: 130, width: 130, rot: 10, layer: "front" },
  // Flag right
  "28329c03-3bc1-4fef-bf0d-dab8ff2c8671": { x: 650, y: 140, width: 90, rot: 0, layer: "front" },
  // Wifey right center
  "4cd14948-24d7-4f2a-b88e-2ae7ec8db0d3": { x: 570, y: 220, width: 210, rot: 0, layer: "front" },
  // Calendly right bottom
  "44e9e923-eff3-4b37-8df4-4ba7fd8ea61a": { x: 540, y: 350, width: 200, rot: -7, layer: "front" },
  // riff right bottom
  "ffbae524-ed07-4173-888d-f7b488ae740c": { x: 590, y: 440, width: 150, rot: -18, layer: "back" },
  // Lego bottom right
  "bac22fa7-aa8b-449f-b477-d2b70533e8e0": { x: 530, y: 500, width: 160, rot: -11, layer: "front" },
  // Hat bottom right
  "424bd304-5232-4064-9230-37f70ba8f6cb": { x: 380, y: 490, width: 230, rot: -10, layer: "front" },
  // Airpods bottom center
  "6adfdb17-ca63-4590-8a39-57c7e6cd3e4f": { x: 120, y: 510, width: 240, rot: 8, layer: "front" },
  // Ray vinyl bottom
  "90410414-e891-48cd-a547-4c6fe5172d84": { x: -10, y: 580, width: 180, rot: 19, layer: "front" },
  // Bottle bottom center
  "169a5de8-10f7-4fdd-9228-92ad59dd6ebf": { x: 270, y: 570, width: 190, rot: 0, layer: "front" },
};

const updatedStickers = stickers.map((s) => {
  const cfg = mobileConfig[s.id];
  if (cfg) {
    return {
      ...s,
      mobile_x: cfg.x,
      mobile_y: cfg.y,
      mobile_width: cfg.width,
      mobile_rotation: cfg.rot,
      mobile_layer: cfg.layer,
    };
  }
  return s;
});

fs.writeFileSync(stickersPath, JSON.stringify(updatedStickers, null, 2));
console.log("Successfully updated stickers.json with default mobile layout!");
