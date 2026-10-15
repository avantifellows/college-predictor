import { useEffect } from "react";
import { useRouter } from "next/router";
import { consumeLaunchToken, syncSession } from "../utils/portalSession";

// Runs on every page: if the portal sent us a launchToken, hand it to the
// server (which starts the session cookie), store the profile, and remove the
// token from the address bar. Otherwise check the session is still live.
const PortalSessionBootstrap = () => {
  const router = useRouter();

  useEffect(() => {
    if (!router.isReady) return;
    const token = router.query.launchToken;
    if (!token) {
      syncSession();
      return;
    }

    const rest = { ...router.query };
    delete rest.launchToken;

    consumeLaunchToken(String(token))
      .catch(() => null)
      .finally(() => {
        router.replace({ pathname: router.pathname, query: rest }, undefined, {
          shallow: true,
        });
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.isReady, router.query.launchToken]);

  return null;
};

export default PortalSessionBootstrap;
