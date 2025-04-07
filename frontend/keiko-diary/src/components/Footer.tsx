'use client';

import { Box, Text } from '@chakra-ui/react';

const Footer: React.FC = () => {
  return (
    <Box as="footer" bg="gray.700" color="white" py={4}>
      <Text textAlign="center" fontSize="sm">
        © {new Date().getFullYear()} MyApp. All rights reserved.
      </Text>
    </Box>
  );
};

export default Footer;