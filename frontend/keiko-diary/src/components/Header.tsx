'use client';

import {
  Box, Flex, Heading, IconButton, Stack, Button, useDisclosure
} from '@chakra-ui/react';
import { HamburgerIcon, CloseIcon } from '@chakra-ui/icons';
import { useSession, signIn, signOut } from 'next-auth/react';

const Header: React.FC = () => {
  const { open, onOpen, onClose } = useDisclosure();
  const toggleMenu = () => (open ? onClose() : onOpen());

  const { data: session, status } = useSession();

  return (
    <Flex as="header" bg="teal.500" color="white" px={6} py={4} align="center" justify="space-between">
      <Heading size="md">MyApp</Heading>

      <Box display={{ base: "block", md: "none" }} onClick={toggleMenu}>
        <IconButton
          aria-label="Toggle Menu"
          // icon={open ? <CloseIcon /> : <HamburgerIcon />}
          variant="ghost"
        />
      </Box>

      <Stack
        direction={{ base: "column", md: "row" }}
        display={{ base: open ? "flex" : "none", md: "flex" }}
        // spacing={4}
        alignItems="center"
      >
        {status === 'loading' ? null : session ? (
          <Button variant="outline" onClick={() => signOut()}>
            ログアウト
          </Button>
        ) : (
          <Button variant="outline" onClick={() => signIn('google')}>
            Googleでログイン
          </Button>
        )}
      </Stack>
    </Flex>
  );
};

export default Header;