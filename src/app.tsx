import { Route, Routes } from "react-router-dom";

import { AppShell } from "./components/layout/app-shell";
import { ListingRepositoryProvider } from "./lib/listing-repository-context";
import { BrowsePage } from "./pages/browse/browse-page";
import { HomePage } from "./pages/home/home-page";
import { ListingDetailPage } from "./pages/listing-detail/listing-detail-page";
import { PostListingPage } from "./pages/post-listing/post-listing-page";

export function App() {
  return (
    <ListingRepositoryProvider>
      <AppShell>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/browse" element={<BrowsePage />} />
          <Route path="/listings/:listingId" element={<ListingDetailPage />} />
          <Route path="/post" element={<PostListingPage />} />
        </Routes>
      </AppShell>
    </ListingRepositoryProvider>
  );
}
