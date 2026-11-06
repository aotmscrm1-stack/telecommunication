"use client";

import * as React from "react";
import { X, ArrowLeft, Mail, KeyRound, FingerprintIcon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Drawer,
  DrawerTrigger,
  DrawerClose,
  DrawerTitle,
  DrawerDescription,
  DrawerContent,
} from "@/components/ui/family-signin-drawer-utils/drawer";
import {
  AnimatedTabs,
  AnimatedTabsList,
  AnimatedTabsTrigger,
  AnimatedTabsContent,
  useMeasure,
} from "@/components/ui/family-signin-drawer-utils/tabs";

export function SignInDrawer({ children }: { children?: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const [step, setStep] = React.useState<"default" | "passkey">("default");
  const [ref, bounds] = useMeasure<HTMLDivElement>();

  const handleSignIn = () => setStep("passkey");
  const handleBack = () => setStep("default");

  const handleOpenChange = (v: boolean) => {
    if (!v) {
      setTimeout(() => setStep("default"), 300);
    }
    setOpen(v);
  };

  return (
    <div className="h-svh flex items-center justify-center">
      <Drawer open={open} onOpenChange={handleOpenChange}>
        <DrawerTrigger asChild>
          {children || (
            <button
              type="button"
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md bg-secondary px-2.5 text-sm font-medium text-secondary-foreground transition-all active:scale-95"
            >
              Sign In
            </button>
          )}
        </DrawerTrigger>
        <DrawerContent>
          <DrawerClose className="bg-muted text-foreground absolute right-6 top-5 z-10 flex h-8 w-8 items-center justify-center rounded-full transition-transform active:scale-75">
            <X className="size-5 opacity-75" />
          </DrawerClose>

          <div className="flex items-center justify-between px-6 py-6 text-center text-xl font-semibold tracking-tight">
            {step === "passkey" && (
              <button
                onClick={handleBack}
                type="button"
                className="bg-muted text-foreground absolute left-6 top-5 z-10 flex h-8 w-8 items-center justify-center rounded-full transition-transform active:scale-75"
              >
                <ArrowLeft className="size-5" />
              </button>
            )}
            <span className="flex-1 select-none text-center">
              {step === "default" ? "Sign In" : "Signing in"}
            </span>
            {step === "passkey" && <div className="w-8" />}
          </div>

          <DrawerTitle className="sr-only">Sign In</DrawerTitle>
          <DrawerDescription className="sr-only">
            Sign in to your account
          </DrawerDescription>

          <motion.div
            animate={{
              height:
                bounds.height > 0
                  ? bounds.height
                  : step === "default"
                    ? 380
                    : 320,
            }}
            transition={{ type: "spring", bounce: 0, duration: 0.4 }}
            className="overflow-hidden will-change-transform"
          >
            <div ref={ref} className="px-6 pb-6">
              <AnimatePresence mode="popLayout" initial={false}>
                {step === "default" ? (
                  <motion.div
                    key="default"
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={{ type: "spring", bounce: 0, duration: 0.3 }}
                  >
                    <AnimatedTabs defaultValue="email">
                      <AnimatedTabsList>
                        <AnimatedTabsTrigger value="email">
                          <Mail className="size-4 mr-1.5" />
                          Email
                        </AnimatedTabsTrigger>
                        <AnimatedTabsTrigger value="passkey">
                          <KeyRound className="size-4 mr-1.5" />
                          Passkey
                        </AnimatedTabsTrigger>
                      </AnimatedTabsList>

                      <AnimatedTabsContent value="email" className="pt-6 pb-2">
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <label htmlFor="signin-email" className="sr-only">
                              Email
                            </label>
                            <input
                              id="signin-email"
                              type="email"
                              placeholder="Email"
                              className="bg-muted border-transparent focus-visible:border-transparent focus-visible:ring-transparent flex h-12 w-full rounded-2xl border px-4 py-1 text-base outline-none transition-colors placeholder:text-muted-foreground disabled:opacity-50 md:text-sm"
                            />
                          </div>
                          <div className="space-y-2">
                            <label
                              htmlFor="signin-password"
                              className="sr-only"
                            >
                              Password
                            </label>
                            <input
                              id="signin-password"
                              type="password"
                              placeholder="Password"
                              className="bg-muted border-transparent focus-visible:border-transparent focus-visible:ring-transparent flex h-12 w-full rounded-2xl border px-4 py-1 text-base outline-none transition-colors placeholder:text-muted-foreground disabled:opacity-50 md:text-sm"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={handleSignIn}
                            className="inline-flex h-12 w-full items-center justify-center gap-1.5 rounded-2xl bg-primary px-2.5 text-base font-medium text-primary-foreground transition-all active:scale-95"
                          >
                            Sign In with Email
                          </button>
                          <button
                            type="button"
                            className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
                          >
                            Forgot password?
                          </button>
                        </div>
                      </AnimatedTabsContent>

                      <AnimatedTabsContent
                        value="passkey"
                        className="pt-6 pb-2"
                      >
                        <div className="space-y-4">
                          <div className="flex items-center justify-center h-16">
                            <div className="p-3 bg-muted rounded-xl">
                              <FingerprintIcon className="size-12" />
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground text-center">
                            Sign in quickly with a passkey
                          </p>
                          <button
                            type="button"
                            onClick={handleSignIn}
                            className="inline-flex h-12 w-full items-center justify-center gap-1.5 rounded-2xl bg-primary px-2.5 text-base font-medium text-primary-foreground transition-all active:scale-95"
                          >
                            Continue with Passkey
                          </button>
                        </div>
                      </AnimatedTabsContent>
                    </AnimatedTabs>
                  </motion.div>
                ) : (
                  <motion.div
                    key="passkey"
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={{ type: "spring", bounce: 0, duration: 0.3 }}
                    className="space-y-6"
                  >
                    <div className="flex items-center justify-center py-8">
                      <div className="relative flex items-center justify-center overflow-hidden rounded-[22px] p-0.5">
                        <motion.div
                          className="absolute left-[-50%] top-[-50%] h-[200%] w-[200%] bg-[conic-gradient(from_0deg,transparent_0%,#4DAFFE_10%,#4DAFFE_25%,transparent_35%)]"
                          animate={{ rotate: 360 }}
                          transition={{
                            duration: 1.25,
                            repeat: Infinity,
                            ease: "linear",
                            repeatType: "loop",
                          }}
                        />
                        <div className="z-1 flex items-center justify-center rounded-[20px] p-1">
                          <div className="flex items-center justify-center rounded-2xl bg-muted p-1">
                            <div className="flex size-16 items-center justify-center rounded-xl">
                              <KeyRound className="size-8 text-foreground" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}

export default SignInDrawer;

