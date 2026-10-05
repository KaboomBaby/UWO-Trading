import { Route, Routes } from "react-router-dom";

import { AppShell } from "./components/layout/app-shell";
import { ListingRepositoryProvider } from "./lib/listing-repository-context";
import { MarketRepositoryProvider } from "./lib/market-repository-context";
import { TradingRepositoryProvider } from "./lib/trading-repository-context";
import { BrowsePage } from "./pages/browse/browse-page";
import { ComponentsPage } from "./pages/components/components-page";
import { HomePage } from "./pages/home/home-page";
import { ListingDetailPage } from "./pages/listing-detail/listing-detail-page";
import { PortsPage } from "./pages/ports/ports-page";
import { PostListingPage } from "./pages/post-listing/post-listing-page";
import { SearchPage } from "./pages/search/search-page";
import { LeaderboardsPage } from "./pages/trading/leaderboards/leaderboards-page";
import { PriceAlertsPage } from "./pages/trading/price-alerts/price-alerts-page";
import { MarketPricesPage } from "./pages/trading/market-prices/market-prices-page";

export function App() {
  return (
    <ListingRepositoryProvider>
      <MarketRepositoryProvider>
        <TradingRepositoryProvider>
          <AppShell>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/browse" element={<BrowsePage />} />
              <Route
                path="/listings/:listingId"
                element={<ListingDetailPage />}
              />
              <Route path="/post" element={<PostListingPage />} />
              <Route path="/search" element={<SearchPage />} />
              <Route path="/ports" element={<PortsPage />} />
              <Route path="/components" element={<ComponentsPage />} />
              <Route path="/market/prices" element={<MarketPricesPage />} />
              <Route
                path="/trading/price-alerts"
                element={<PriceAlertsPage />}
              />
              <Route
                path="/trading/leaderboards"
                element={<LeaderboardsPage />}
              />
            </Routes>
          </AppShell>
        </TradingRepositoryProvider>
      </MarketRepositoryProvider>
    </ListingRepositoryProvider>
  );
}
