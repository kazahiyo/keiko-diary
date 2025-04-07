import { Theme } from "@chakra-ui/react";

// カスタムカラー
// const color = {
//   brand: {
//     50: "#e3f2f9",
//     100: "#c5e4f3",
//     200: "#a2d4ec",
//     300: "#7ac1e4",
//     400: "#47a9da",
//     500: "#0088cc", // プライマリカラー
//     600: "#007ab8",
//     700: "#006ba1",
//     800: "#005885",
//     900: "#003f5e",
//   },
// };

// カスタムフォント
const font = {
  heading: "Arial, sans-serif",
  body: "Georgia, serif",
};

// ブレークポイント
const breakpoints = {
  sm: "30em",
  md: "48em",
  lg: "62em",
  xl: "80em",
};

// コンポーネントのスタイル
const components = {
  Button: {
    baseStyle: {
      fontWeight: "bold", // ボールドフォント
    },
    sizes: {
      xl: {
        h: "56px",
        fontSize: "lg",
        px: "32px",
      },
    },
    variants: {
      solid: {
        bg: "brand.500",
        color: "white",
        _hover: {
          bg: "brand.600",
        },
      },
    },
  },
};

// カスタムテーマの作成
const customTheme = Theme({ });

export default customTheme;
