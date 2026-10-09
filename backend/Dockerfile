# syntax=docker/dockerfile:1

# ----- Build -----
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Restore against the project files first so code changes don't invalidate the
# NuGet layer.
COPY Directory.Build.props Directory.Packages.props ./
COPY src/Travelov.Domain/Travelov.Domain.csproj src/Travelov.Domain/
COPY src/Travelov.Application/Travelov.Application.csproj src/Travelov.Application/
COPY src/Travelov.Infrastructure/Travelov.Infrastructure.csproj src/Travelov.Infrastructure/
COPY src/Travelov.Api/Travelov.Api.csproj src/Travelov.Api/
RUN dotnet restore src/Travelov.Api/Travelov.Api.csproj

COPY src/ src/
RUN dotnet publish src/Travelov.Api/Travelov.Api.csproj \
    -c Release \
    -o /app/publish \
    /p:UseAppHost=false

# ----- Runtime -----
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app

COPY --from=build /app/publish .

ENV ASPNETCORE_URLS=http://+:8080
ENV DOTNET_EnableDiagnostics=0
EXPOSE 8080

ENTRYPOINT ["dotnet", "Travelov.Api.dll"]
