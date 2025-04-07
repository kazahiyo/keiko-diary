"use client";

import Image from "next/image";
import { Provider } from "@/components/ui/provider";
import { Checkbox } from "@chakra-ui/react";

export default function Home() {
  return (
    <Provider>
        <main>
          <Checkbox.Root>
            <Checkbox.HiddenInput />
            <Checkbox.Control>
              <Checkbox.Indicator />
            </Checkbox.Control>
            <Checkbox.Label />
              asdfdsa
          </Checkbox.Root>
          hello next app
        </main>
    </Provider>
  );
}
